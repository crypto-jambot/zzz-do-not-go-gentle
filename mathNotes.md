# Cyclic Arbitrage Notes

This is intended to help make sense of some Mathmatical equations to better understand Profitable DEX Crypto Arbitrage

### Formulas

---

## Constant Product

For any liquidity pool that conforms to the Constant Product Market Maker (CPMM), a type of Automated Market Maker (AMM) The following equation always holds true.

_Variable Definitions_

|        Symbol         | Description                                                            |
| :-------------------: | ---------------------------------------------------------------------- |
|          _A_          | Token A                                                                |
|          _B_          | Token B                                                                |
|          _a_          | The reserve amount of _A_                                              |
|          _b_          | The reserve amount of _B_                                              |
| &delta;<sub>_a_</sub> | The input amount of _A_ to the liquidity pool                          |
| &delta;<sub>_b_</sub> | The output amount of _B_ from the liquidity pool                       |
|   _r_<sub>_1_</sub>   | The commission fee in _A_ when executing a trade on the liquidity pool |
|   _r_<sub>_2_</sub>   | The commission fee in _B_ when executing a trade on the liquidity pool |

_Equation_

> _a_ &#8729; _b_ = ( _a_ + &delta;<sub>_a_</sub> &#8729; _r_<sub>_1_</sub> ) &#8729; ( _b_ - Todo )
