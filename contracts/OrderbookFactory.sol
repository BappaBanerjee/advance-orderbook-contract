// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";
import {Orderbook} from "./Orderbook.sol"; 


contract OrderbookFactory {

    error Orderbook_Not_Found();
    error Insufficient_Balance();
    error Transaction_Failed();
    error Not_Authotrised();

    event Orderbook_Created(address indexed orderbookAddr);


    address immutable owner;

    mapping(address=>mapping(address=>Orderbook)) public orderbooks;
    mapping (address=>bool) public isMapContract;
    mapping(address=>mapping (address=>uint)) internal  balanceOf;

    modifier onlyMapContracts {
        if(!isMapContract[msg.sender]) revert Not_Authotrised();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function deposit(address _contract, uint _amount) public{
        require(IERC20(_contract).allowance(msg.sender, address(this)) >= _amount, "Insufficient allowance");
        bool success = IERC20(_contract).transferFrom(msg.sender, address(this), _amount);
        if(!success) revert Transaction_Failed();
        balanceOf[msg.sender][_contract] += _amount;
    }

    function withdraw(address _contract , uint _amount) public  {
        if(balanceOf[msg.sender][_contract] < _amount) revert Insufficient_Balance();
        balanceOf[msg.sender][_contract] -= _amount;
        bool success = IERC20(_contract).transfer(msg.sender, _amount);
        if(!success) revert Transaction_Failed();
    }

    function _balanceOf(address _token) public view returns(uint) {
        return balanceOf[msg.sender][_token];
    }

    function updateBalance(address _user, address _token, uint _amount) public onlyMapContracts{
        balanceOf[_user][_token] += _amount;
    } 

    function deductBalance(address _user, address _token, uint _amount) public  onlyMapContracts{
        if(balanceOf[msg.sender][_token] < _amount) revert Insufficient_Balance();
        balanceOf[_user][_token] -= _amount;
    }

    function createOrderbook(address _base, address _quote) public {
        if(msg.sender != owner) revert Not_Authotrised();
        Orderbook orderbook = new Orderbook(address(this), _base, _quote);
        orderbooks[_base][_quote] = orderbook;
        isMapContract[address(orderbook)] = true;
        emit Orderbook_Created(address(orderbook));
    }

    function placeBuyOrder(uint _limitPrice, uint _quantity, address _base, address _quote) public{
        if(address(orderbooks[_base][_quote]) == address(0)) revert Orderbook_Not_Found();

        uint baseDecimal = 10 ** IERC20(_base).decimals();
        uint total = _limitPrice * _quantity / baseDecimal;

        require(total > 0, "Invalid params");

        if(balanceOf[msg.sender][_quote] < total) revert Insufficient_Balance();

        balanceOf[msg.sender][_quote] -= total;

        Orderbook orderbook = orderbooks[_base][_quote];
        orderbook.placeOrder(msg.sender, _limitPrice, _quantity, true);
    }

    function placeSellOrder(uint _limitPrice, uint _quantity, address _base, address _quote) public{
        require(_limitPrice > 0 && _quantity > 0, "Invalid params");
        if(address(orderbooks[_base][_quote]) == address(0)) revert Orderbook_Not_Found();
        if(balanceOf[msg.sender][_base] < _quantity) revert Insufficient_Balance();

        balanceOf[msg.sender][_base] -= _quantity;
        Orderbook orderbook = orderbooks[_base][_quote];
        orderbook.placeOrder(msg.sender, _limitPrice, _quantity, false);
    }

    function buyAtMarketPrice(uint _total, address _base, address _quote) public{
        require(_total > 0, "invalid params");
        if(balanceOf[msg.sender][_quote] < _total) revert Insufficient_Balance();
        Orderbook orderbook = orderbooks[_base][_quote];
        orderbook.buyAtMarketPrice(msg.sender, _total);
    }

    function sellAtMarketPrice(uint _total, address _base, address _quote) public{
        require(_total > 0 , "invalid params");
        if(balanceOf[msg.sender][_base] < _total) revert Insufficient_Balance();
        Orderbook orderbook = orderbooks[_base][_quote];
        orderbook.sellAtMarketPrice(msg.sender, _total);
    }

}

