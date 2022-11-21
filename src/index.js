/*********************************************************************
 * Copyright (C) 2022 Joshua Sells joshuataylorsells@gmail.com
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 *
 * Proprietary and confidential
 *
 *********************************************************************/

import Big from 'big.js';
import 'dotenv/config';
import {
    filterNullPairs,
    getPairContracts,
    getReserves,
    getExploitablePaths,
    calculateEquivalentLiquidity,
    calculateOptimalTradingVolume,
    calculateRevenue,
    filterEmptyReserves,
} from './util/util';

export const main = async (data) => {
    data.exchangePath = filterNullPairs(data.exchangePath);
    data.exchangePath = getPairContracts(data.exchangePath);

    // Get all reserves
    for (let i = 0; i < data.exchangePath.length; i++) {
        for (let j = 0; j < data.exchangePath[i].options.length; j++) {
            data.exchangePath[i].options[j].reserves = await getReserves(
                data.exchangePath[i].options[j].pairContract
            );
        }
    }

    data.exchangePath = filterEmptyReserves(data.exchangePath);

    // FOR LOGGING PURPOSES. TO SEE WHAT THE DATA LOOKS LIKE AT THIS CURRENT POINT IN TIME.
    // console.log(
    //     JSON.stringify(data, (key, value) => {
    //         if (key == 'pairContract') {
    //             return 'ContractObject';
    //         }
    //         return value;
    //     })
    // );

    let paths = getExploitablePaths(data);
    if (!paths.length > 0) return;
    // console.log(JSON.stringify(data.tokenPath));

    // Calculate the equivalent liquidity of a virtual pool of the first token and token n
    paths = paths.map((path) => calculateEquivalentLiquidity(path));

    // Using the virtual reserve values (equivalent liquidity), calculate the optimal amount to input into the cyclical arbitrage path.
    paths = paths.map((path) => calculateOptimalTradingVolume(path));

    // // Using the optimal trading amount, calculate the revenue made from each path;
    paths = paths.map((path) => calculateRevenue(path));

    paths.sort((a, b) => Big(b.gross).minus(Big(a.gross)));
    console.log(paths[0]);
    for (const p of paths[0].path) {
        console.log(p);
    }
    // console.log(paths[0].path[paths[0].path.length - 1]);
    if (Big(paths[0].gross).div(Big(10).pow(18)).toNumber(8) >= 0.01) {
        console.log('\n\n------------------------------------');
        for (let i = 0; i < paths[0].path.length; i++) {
            console.log(
                `Trade ${i + 1} -- ${paths[0].path[i].data.name.toUpperCase()} -- Tokens: ${
                    data.tokenPath[i].symbol
                }(${data.tokenPath[i].address}) -> ${data.tokenPath[i + 1].symbol}(${
                    data.tokenPath[i + 1].address
                })`
            );
        }
        console.log(`Input: ${Big(paths[0].optimalTradingVolume).div(Big(10).pow(18)).toFixed(8)}`);
        console.log(`Output: ${Big(paths[0].revenue).div(Big(10).pow(18)).toFixed(8)}`);
        console.log(`Profit: ${Big(paths[0].gross).div(Big(10).pow(18)).toFixed(8)} MATIC`);
        console.log('------------------------------------\n\n');
    }
};
