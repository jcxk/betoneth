/* global assert */

module.exports = function checkInvalidJump(error) {
    assert.isAbove(
    error.message.search("invalid opcode"),
    -1,
    "invalid opcode error must be returned"
  );
};
