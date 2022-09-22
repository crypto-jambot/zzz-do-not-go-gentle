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
        console.error(`ERROR: Empty Reserves for pair contract: ${pairContract._address}`);
        return null;
    }
    if (Big(reserve0).lt(Big(0)) || Big(reserve1).lt(Big(0))) {
        console.error(`ERROR: Negative Reserves for pair contract: ${pairContract._address}`);
        return null;
    }
    return { reserve0, reserve1 };
};

export const checkProfitability = (data) => {
    const paths = [];

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
            // const swap = `${data.exchangePath[swapIndex].options[i].name} - ${data.exchangePath[swapIndex].options[i].pairAddress}`;
            path.add(swap);
            getAllPaths(path, swapIndex + 1);
            path.delete(swap);
        }
    };

    getAllPaths();
    console.log(paths[0]);

    const isValueExtractable = (path) => {
        const data = path.map((swap) => JSON.parse(swap));

        let numerator = 1;
        let denominator = 1;
        const reserves = [];
        for (const swap of data) {
            reserves.push([]);
        }

        for (let i = 0; i < data.length; i++) {
            if (i + 1 == data.length) {
                if (data[i].ordered) {
                    reserves[i][0] = data[i].data.reserves.reserve0;
                    reserves[0][i] = data[i].data.reserves.reserve1;
                } else {
                    reserves[0][i] = data[i].data.reserves.reserve0;
                    reserves[i][0] = data[i].data.reserves.reserve1;
                }
            } else {
                if (data[i].ordered) {
                    reserves[i][i + 1] = data[i].data.reserves.reserve0;
                    reserves[i + 1][i] = data[i].data.reserves.reserve1;
                } else {
                    reserves[i + 1][i] = data[i].data.reserves.reserve0;
                    reserves[i][i + 1] = data[i].data.reserves.reserve1;
                }
            }
        }
        console.log(reserves);

        for (let i = 0; i < data.length; i++) {
            if (i + 1 == data.length) {
                numerator = Big(numerator).times(Big(reserves[0][i])).toString();
                denominator = Big(denominator).times(Big(reserves[i][0])).toString();
            } else {
                numerator = Big(numerator)
                    .times(Big(reserves[i + 1][i]))
                    .toString();
                denominator = Big(denominator)
                    .times(Big(reserves[i][i + 1]))
                    .toString();
            }
        }
        console.log(numerator);
        console.log(denominator);
        console.log(Big(numerator).div(Big(denominator)).toString());
    };

    isValueExtractable(paths[0]);
};
