// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, ERC20Burnable, Ownable {

    mapping(address => bool) public minter;

    modifier onlyMinterOrOwner() {
        require(minter[msg.sender] || msg.sender == owner());
        _;
    }

    constructor(address initialOwner)
        ERC20("OpenSwap", "OS")
        Ownable(initialOwner)
    {}

    function mint(address to, uint256 amount) public onlyMinterOrOwner {
        _mint(to, amount);
    }

    function updateMinter(address newMinter, bool isMinter) external onlyOwner {
        minter[newMinter] = isMinter;
    }
}