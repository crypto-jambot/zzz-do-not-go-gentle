/*********************************************************************
 * Copyright (C) 2022 Joshua Sells joshuataylorsells@gmail.com
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 *
 * Proprietary and confidential
 *
 *********************************************************************/

import 'dotenv/config';
import { filterNullPairs, getPairContracts, getReserves, checkProfitability } from './util/util';

export const main = async (data) => {
    // Filter null values
    data.exchangePath = filterNullPairs(data.exchangePath);

    // Get pair contracts
    data.exchangePath = getPairContracts(data.exchangePath);

    // Get all reserves
    for (let i = 0; i < data.exchangePath.length; i++) {
        for (let j = 0; j < data.exchangePath[i].options.length; j++) {
            data.exchangePath[i].options[j].reserves = await getReserves(data.exchangePath[i].options[j].pairContract);
        }
    }

    console.log(
        JSON.stringify(data, (key, value) => {
            if (key == 'pairContract') {
                return 'ContractObject';
            }
            return value;
        })
    );

    // Apply formula
    checkProfitability(data);
    // Print out profitability boolean
};

// console.log(data);
// for (const ye of data.exchangePath) {
//     for (const ok of ye.options) {
//         console.log(ok.reserves);
//     }
// }
// console.log('done');
