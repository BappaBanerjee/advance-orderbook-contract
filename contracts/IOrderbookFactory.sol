
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IOrderbookFactory {
    event Orderbook_Created(address indexed orderbookAddr);

    function updateBalance(address _user, address _token, uint _amount) external;
    function deductBalance(address _user, address _token, uint _amount) external;
}