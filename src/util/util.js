/*********************************************************************
 * Copyright (C) 2022 Joshua Sells joshuataylorsells@gmail.com
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 *
 * Proprietary and confidential
 *
 *********************************************************************/

import Big from 'big.js';
import { web3 } from '../setup/setup';
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json';
import { R1, R2 } from '../constants/constants';

// Takes in input data from bigquery and filters out null pairAddresses
export const filterNullPairs = (exchangePath) => {
    return exchangePath.map((path) => {
        let options = path.options.filter((pair) => {
            return pair.pairAddress != null;
        });
        return {
            options: options,
            ordered: path.ordered,
        };
    });
};

// Takes in input data and adds all pair contracts before returning the data.
export const getPairContracts = (exchangePath) => {
    return exchangePath.map((path) => {
        let options = path.options.map((pair) => {
            return {
                name: pair.name,
                pairAddress: pair.pairAddress,
                pairContract: getPairContract(pair.pairAddress),
            };
        });
        return {
            options: options,
            ordered: path.ordered,
        };
    });
};

const getPairContract = (pairAddress) => {
    return new web3.eth.Contract(IUniswapV2Pair.abi, pairAddress);
};

export const getReserves = async (pairContract) => {
    const { reserve0, reserve1 } = await pairContract.methods.getReserves().call();
    if (Big(reserve0).eq(Big(0)) || Big(reserve1).eq(Big(0))) {
        // console.error(`ERROR: Empty Reserves for pair contract: ${pairContract._address}`);
        return null;
    }
    if (Big(reserve0).lt(Big(0)) || Big(reserve1).lt(Big(0))) {
        // console.error(`ERROR: Negative Reserves for pair contract: ${pairContract._address}`);
        return null;
    }
    return { reserve0, reserve1 };
};

// Takes in input data and filters out empty reserve pools.
export const filterEmptyReserves = (exchangePath) => {
    return exchangePath.map((path) => {
        let options = path.options.filter((pair) => {
            return pair.reserves != null;
        });
        return {
            options: options,
            ordered: path.ordered,
        };
    });
};

// Returns an array of exploitable path combinations using the token path provided.
export const getExploitablePaths = (data) => {
    const getAllPaths = (path = new Set(), swapIndex = 0) => {
        if (swapIndex == data.exchangePath.length) {
            paths.push(Array.from(path));
            return;
        }
        for (let i = 0; i < data.exchangePath[swapIndex].options.length; i++) {
            const swap = JSON.stringify(
                {
                    data: data.exchangePath[swapIndex].options[i],
                    ordered: data.exchangePath[swapIndex].ordered,
                },
                (key, value) => {
                    if (key == 'pairContract') {
                        return undefined;
                    }
                    return value;
                }
            );
            path.add(swap);
            getAllPaths(path, swapIndex + 1);
            path.delete(swap);
        }
    };

    const isValueExtractable = (path) => {
        const data = path.map((swap) => JSON.parse(swap));
        // Calculate the arbitrage index, which is the product of n exchange rates along the cycle.
        let leftOperand = 1;
        for (let i = 0; i < data.length; i++) {
            if (data[i].ordered) {
                leftOperand = Big(leftOperand).times(
                    Big(data[i].data.reserves.reserve1).div(Big(data[i].data.reserves.reserve0))
                );
            } else {
                leftOperand = Big(leftOperand).times(
                    Big(data[i].data.reserves.reserve0).div(Big(data[i].data.reserves.reserve1))
                );
            }
        }
        // Calculate the commission fees paid in the n pools.
        let rightOperand = Big(1).div(Big(R1).pow(data.length).times(Big(R2).pow(data.length)));
        // Value is extractable only if the arbitrage index is greater then the commission fees.
        return leftOperand.gt(rightOperand);
    };

    const paths = [];
    getAllPaths();
    return paths.filter((path) => isValueExtractable(path));
};

// Takes a path array as input and adds an equivalent liquidity object to it before returning the path.
export const calculateEquivalentLiquidity = (path) => {
    /* Input is a swap object. Example:
        {
        "data":{
            "name":"apeswap",
            "pairAddress":"0x019011032a7ac3A87eE885B6c08467AC46ad11CD",
            "reserves":{
                "reserve0":"359909789745711497410",
                "reserve1":"311634971"
            }
        },
        "ordered":true
        }
    */
    const getOrderedReserves = (swap) => {
        return swap.ordered
            ? [swap.data.reserves.reserve0, swap.data.reserves.reserve1]
            : [swap.data.reserves.reserve1, swap.data.reserves.reserve0];
    };

    const data = path.map((swap) => JSON.parse(swap));

    let inputReserve;
    let outputReserve;
    [inputReserve, outputReserve] = getOrderedReserves(data[0]);

    for (let i = 1; i < data.length - 1; i++) {
        let ithInputReserve;
        let ithOutputReserve;
        [ithInputReserve, ithOutputReserve] = getOrderedReserves(data[i]);

        let iRNumerator = Big(inputReserve).times(Big(ithInputReserve));
        let iRDenominator = Big(ithInputReserve).plus(
            Big(R1).times(Big(R2)).times(Big(outputReserve))
        );

        let oRNumerator = Big(R1)
            .times(Big(R2))
            .times(Big(outputReserve))
            .times(Big(ithOutputReserve));
        let oRDenominator = Big(ithInputReserve).plus(
            Big(R1).times(Big(R2)).times(Big(outputReserve))
        );

        inputReserve = iRNumerator.div(iRDenominator).toString();
        outputReserve = oRNumerator.div(oRDenominator).toString();
    }

    return {
        path: data,
        equivalentLiquidity: {
            inputReserve: inputReserve,
            outputReserve: outputReserve,
        },
    };
};

export const calculateOptimalTradingVolume = (path) => {
    const calculateA = () => {
        let aNumerator = Big(virtualInputReserve).times(Big(lastSwapInputReserve));
        let aDenominator = Big(lastSwapInputReserve).plus(
            Big(R1).times(Big(R2)).times(Big(virtualOutputReserve))
        );
        return aNumerator.div(aDenominator);
    };

    const calculateAPrime = () => {
        let aPrimeNumerator = Big(R1)
            .times(Big(R2))
            .times(Big(lastSwapOutputReserve))
            .times(Big(virtualOutputReserve));
        let aPrimeDenominator = Big(lastSwapInputReserve).plus(
            Big(R1).times(Big(R2)).times(Big(virtualOutputReserve))
        );
        return aPrimeNumerator.div(aPrimeDenominator);
    };

    let virtualInputReserve = path.equivalentLiquidity.inputReserve;
    let virtualOutputReserve = path.equivalentLiquidity.outputReserve;
    let lastSwapInputReserve = path.path[path.path.length - 1].ordered
        ? path.path[path.path.length - 1].data.reserves.reserve0
        : path.path[path.path.length - 1].data.reserves.reserve1;
    let lastSwapOutputReserve = path.path[path.path.length - 1].ordered
        ? path.path[path.path.length - 1].data.reserves.reserve1
        : path.path[path.path.length - 1].data.reserves.reserve0;

    let a = calculateA(path);
    let aPrime = calculateAPrime(path);

    let numerator = Big(R1).times(Big(R2)).times(Big(aPrime)).times(Big(a)).sqrt().minus(Big(a));
    let denominator = Big(R1);

    let optimalTradingVolume = Big(numerator).div(Big(denominator)).toString();
    path.optimalTradingVolume = optimalTradingVolume;
    return path;
};

export const calculateRevenue = (path) => {
    let tradeNAmountOut = getAmountOut(
        path.optimalTradingVolume,
        path.equivalentLiquidity.inputReserve,
        path.equivalentLiquidity.outputReserve
    );
    let lastSwapInputReserve = path.path[path.path.length - 1].ordered
        ? path.path[path.path.length - 1].data.reserves.reserve0
        : path.path[path.path.length - 1].data.reserves.reserve1;
    let lastSwapOutputReserve = path.path[path.path.length - 1].ordered
        ? path.path[path.path.length - 1].data.reserves.reserve1
        : path.path[path.path.length - 1].data.reserves.reserve0;
    path.revenue = getAmountOut(tradeNAmountOut, lastSwapInputReserve, lastSwapOutputReserve);
    path.gross = Big(path.revenue).minus(Big(path.optimalTradingVolume)).toString();
    return path;
};

const getAmountOut = (amountIn, reserveIn, reserveOut) => {
    let amountInWithFee = Big(amountIn).times(997);
    let numerator = amountInWithFee.times(Big(reserveOut));
    let denominator = Big(reserveIn).times(1000).plus(amountInWithFee);
    return numerator.div(denominator).toString();
};
