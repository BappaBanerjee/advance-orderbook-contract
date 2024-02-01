// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IOrderbook {
    enum OrderType{
        BUY,
        SELL
    }
    struct Order {
        uint256 orderId;
        address trader;
        OrderType orderType;
        uint256 price;
        uint256 quantity;
        bool isFilled;
        address baseToken;
        address quoteToken;
    }

    function getBuyorders() external view returns (Order[] memory);
    
    function getSellorders() external view returns (Order[] memory);

    function placeOrder(address _trader, uint _limitPrice, uint _quantity, bool _isBuyOrder) external;

    function buyAtMarketPrice(address _user, uint _total) external;

    function sellAtMarketPrice(address _user, uint _total) external;
}

