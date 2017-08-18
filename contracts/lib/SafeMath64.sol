pragma solidity ^0.4.11;

library SafeMath64 {

  function div(uint64 a, uint64 b) internal returns (uint64) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint64 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  function sub(uint64 a, uint64 b) internal returns (uint64) {
    assert(b <= a);
    return a - b;
  }

  function add(uint64 a, uint64 b) internal returns (uint64) {
    uint64 c = a + b;
    assert(c >= a);
    return c;
  }


}