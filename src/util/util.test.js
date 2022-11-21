const Big = require('big.js');

const getAmountOut = (amountIn, reserveIn, reserveOut) => {
    let amountInWithFee = Big(amountIn).times(997);
    let numerator = amountInWithFee.times(Big(reserveOut));
    let denominator = Big(reserveIn).times(1000).plus(amountInWithFee);
    return numerator.div(denominator).toString();
};

const swapThroughPath = (path, startingAmount) => {
    let outputFromSwapPath = startingAmount;

    for (const swap of path) {
        outputFromSwapPath = swap.ordered
            ? getAmountOut(
                  outputFromSwapPath,
                  swap.data.reserves.reserve0,
                  swap.data.reserves.reserve1
              )
            : getAmountOut(
                  outputFromSwapPath,
                  swap.data.reserves.reserve1,
                  swap.data.reserves.reserve0
              );
    }
    return outputFromSwapPath;
};

const swapThroughEquivalentPool = (path, startingAmount) => {
    let tradeNAmountOut = getAmountOut(
        startingAmount,
        path.equivalentLiquidity.inputReserve,
        path.equivalentLiquidity.outputReserve
    );
    let lastSwapInputReserve = path.path[path.path.length - 1].ordered
        ? path.path[path.path.length - 1].data.reserves.reserve0
        : path.path[path.path.length - 1].data.reserves.reserve1;
    let lastSwapOutputReserve = path.path[path.path.length - 1].ordered
        ? path.path[path.path.length - 1].data.reserves.reserve1
        : path.path[path.path.length - 1].data.reserves.reserve0;
    return getAmountOut(tradeNAmountOut, lastSwapInputReserve, lastSwapOutputReserve);
};

// Algebra formula for calculating the optimal amount to arbitrage from one liquidity pool to the other. Should balance out two pools to equal the same ratio price. (token0Reserves / token1Reserves)
// input0 = Input token reserves for pool0. (The pool you are starting on in the arbitrage transaction).
// output0 = Output token reserves for pool0. (The pool you are starting on in the arbitrage transaction).
// input1 = Input token reserves for poo11. (The pool you are ending on in the arbitrage transaction).
// output1 = Output token reserves for pool1. (The pool you are ending on in the arbitrage transaction).
// k0 = input0 * output0
// k1 = input1 * output1
// x1 = (k1 * output0) + (k0 * input1) + output0 * (squareRoot(k0 * k1)) + input1 * (squareRoot(k0 * k1)) / k1 - k0
// x1 = (k1 * output0) + (k0 * input1) - output0 * (squareRoot(k0 * k1)) - input1 * (squareRoot(k0 * k1)) / k1 - k0
// Checks for the following:
// - Both results being negative
// - Both results being within a valid range
// - Liquidity Constants equal the same. TODO - implement logic to handle the calculation when this occurs.
// - Both results are equal to zero
// - Both results being out of range - meaning that they are both greater than the output0 reserves
calculateAmountToBuy = (input0, output0, input1, output1) => {
    Big.PE = 40;
    Big.RM = 0;
    const input0BN = Big(input0);
    const output0BN = Big(output0);
    const input1BN = Big(input1);
    const output1BN = Big(output1);
    const k0BN = input0BN.times(output0BN);
    const k1BN = input1BN.times(output1BN);
    const sqrtK0K1BN = k0BN.times(k1BN).sqrt();
    const x1Numerator = k1BN
        .times(output0BN)
        .plus(k0BN.times(input1BN))
        .plus(output0BN.times(sqrtK0K1BN))
        .plus(input1BN.times(sqrtK0K1BN));
    const x2Numerator = k1BN
        .times(output0BN)
        .plus(k0BN.times(input1BN))
        .minus(output0BN.times(sqrtK0K1BN))
        .minus(input1BN.times(sqrtK0K1BN));
    const denominator = k1BN.minus(k0BN);
    if (denominator.eq(Big(0))) {
        return null;
    }
    const x1 = x1Numerator.div(denominator);
    const x2 = x2Numerator.div(denominator);
    if (x1.lt(Big(0)) && x2.lt(Big(0))) {
        return null;
    }
    const x1InRange = x1.gt(Big(0)) && x1.lt(output0BN);
    const x2InRange = x2.gt(Big(0)) && x2.lt(output0BN);
    const x1IsZero = x1.eq(Big(0));
    const x2IsZero = x2.eq(Big(0));

    if (x1InRange && x2InRange) {
        return null;
    }

    if (x1IsZero && x2IsZero) {
        return null;
    }

    if (x1.gt(output0BN) && x2.gt(output0BN)) {
        return null;
    }

    if (x1InRange) return x1.toFixed(0);
    if (x2InRange) return x2.toFixed(0);

    // If we get to this point in the calculation, then that means one number is negative and one number is zero.
    // Return the value that equals zero
    return x1IsZero ? x1.toFixed(0) : x2.toFixed(0);
};

const samplePath = {
    path: [
        {
            data: {
                name: 'dfyn',
                pairAddress: '0x75992E8266Ab600d4e9B0D7471dB6ba0D75b44b8',
                reserves: { reserve0: '143707380743855469', reserve1: '132879' },
            },
            ordered: true,
        },
        {
            data: {
                name: 'quickswap',
                pairAddress: '0x2cF7252e74036d1Da831d11089D326296e64a728',
                reserves: { reserve0: '2971783460140', reserve1: '2966043322887' },
            },
            ordered: false,
        },
        {
            data: {
                name: 'sushiswap',
                pairAddress: '0xD02b870c556480491c70AaF98C297fddd93F6f5C',
                reserves: { reserve0: '534729', reserve1: '108395246' },
            },
            ordered: false,
        },
        {
            data: {
                name: 'quickswap',
                pairAddress: '0xf6B87181BF250af082272E3f448eC3238746Ce3D',
                reserves: { reserve0: '13512265899813311767473', reserve1: '60192064' },
            },
            ordered: false,
        },
    ],
    equivalentLiquidity: {
        inputReserve: '143532137556215042.79019744959105684002',
        outputReserve: '652.04852994808815208675',
    },
    optimalTradingVolume: '982885947633628.78732145189757843354',
    revenue: '989596479578496.99254373152106936532',
    gross: '6710531944868.20522227962349093178',
};

const samplePath2 = {
    path: [
        {
            data: {
                name: 'dfyn',
                pairAddress: '0x75992E8266Ab600d4e9B0D7471dB6ba0D75b44b8',
                reserves: { reserve0: '143707380743855469', reserve1: '132879' },
            },
            ordered: true,
        },
        {
            data: {
                name: 'quickswap',
                pairAddress: '0x2cF7252e74036d1Da831d11089D326296e64a728',
                reserves: { reserve0: '2971783460140', reserve1: '2966043322887' },
            },
            ordered: false,
        },
        {
            data: {
                name: 'quickswap',
                pairAddress: '0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827',
                reserves: {
                    reserve0: '3303544212598015044434261',
                    reserve1: '2987042809100',
                },
            },
            ordered: false,
        },
    ],
    equivalentLiquidity: {
        inputReserve: '143707374325066852.71279961230030859276',
        outputReserve: '132736.74424570447240587217',
    },
    optimalTradingVolume: '1106294928807053.58655341828349205052',
    revenue: '1114785911708155.65612459739411830969',
    gross: '8490982901102.06957117911062625917',
};

test('The output of swapping through the path with the optimal amount should have the greatest gross output.', () => {
    Big.DP = 60;
    // Slightly less then optimal amount
    const outputFromSwapPathWithSmallInput = swapThroughPath(samplePath.path, '982885947633000');
    const grossWithSmallInput = Big(outputFromSwapPathWithSmallInput)
        .minus(Big('982885947633000'))
        .toString();

    const outputFromSwapPath2WithSmallInput = swapThroughPath(samplePath2.path, '1106294928807000');
    const grossWithSmallInput2 = Big(outputFromSwapPath2WithSmallInput)
        .minus(Big('1106294928807000'))
        .toString();

    // Optimal amount
    const outputFromSwapPath = swapThroughPath(samplePath.path, samplePath.optimalTradingVolume);
    const grossWithOptimal = Big(outputFromSwapPath)
        .minus(Big(samplePath.optimalTradingVolume))
        .toString();

    const outputFromSwapPath2 = swapThroughPath(samplePath2.path, samplePath2.optimalTradingVolume);
    const grossWithOptimal2 = Big(outputFromSwapPath2)
        .minus(Big(samplePath2.optimalTradingVolume))
        .toString();

    // Slightly more then optimal amount
    const outputFromSwapPathWithBigInput = swapThroughPath(samplePath.path, '982885947634000');
    const grossWithBigInput = Big(outputFromSwapPathWithBigInput)
        .minus(Big('982885947634000'))
        .toString();

    const outputFromSwapPath2WithBigInput = swapThroughPath(samplePath2.path, '1106294928807055');
    const grossWithBigInput2 = Big(outputFromSwapPath2WithBigInput)
        .minus(Big('1106294928807055'))
        .toString();

    expect(Big(grossWithSmallInput).lt(Big(grossWithOptimal))).toBeTruthy();
    expect(Big(grossWithBigInput).lt(Big(grossWithOptimal))).toBeTruthy();

    expect(Big(grossWithSmallInput2).lt(Big(grossWithOptimal2))).toBeTruthy();
    expect(Big(grossWithBigInput2).lt(Big(grossWithOptimal2))).toBeTruthy();
});

test('The output of swapping through the path should equal the output of using the virtual equivalent liquidity.', () => {
    Big.DP = 20;
    expect(swapThroughPath(samplePath.path, samplePath.optimalTradingVolume)).toBe(
        swapThroughEquivalentPool(samplePath, samplePath.optimalTradingVolume)
    );
    expect(swapThroughPath(samplePath2.path, samplePath2.optimalTradingVolume)).toBe(
        swapThroughEquivalentPool(samplePath2, samplePath2.optimalTradingVolume)
    );

    console.log(
        calculateAmountToBuy('143532137556215042', '652', '60192064', '13512265899813311767473')
    );
});
