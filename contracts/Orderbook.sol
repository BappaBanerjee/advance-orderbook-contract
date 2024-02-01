// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IOrderbook} from "./IOrderbook.sol";
import {IOrderbookFactory} from "./IOrderbookFactory.sol";
import "./IERC20.sol";

contract Orderbook is IOrderbook {

    address immutable i_factory;
    address public immutable _base;
    address public immutable _quote;

    Order [] private buyOrders;
    Order [] private sellOrders;

    uint curBuyOrderId;
    uint curSellOrderId;

    modifier onlyOwner {
        require(msg.sender == i_factory, "Not Authorised");
        _;
    }

    constructor(address _owner, address base, address quote){
        i_factory = _owner;
        _base = base;
        _quote = quote;
    }

    function getOwner() public view returns(address){
        return i_factory;
    }

    function getBuyorders() public view returns(Order[] memory){
        return buyOrders;
    }

    function getSellorders() public view returns(Order[] memory){
        return sellOrders;
    }

    function placeOrder(address _trader, uint _limitPrice, uint _quantity, bool _isBuyOrder) public onlyOwner{
        Order memory newOrder = Order(
            _isBuyOrder ? ++curBuyOrderId : ++curSellOrderId,
            _trader,
            _isBuyOrder ? OrderType.BUY: OrderType.SELL, 
            _limitPrice,
            _quantity,
            false,
            _base,
            _quote
        );
        uint baseDecimal = 10 ** IERC20(_base).decimals();
        uint pointer = inserOrder(newOrder, _isBuyOrder);
        _isBuyOrder ? matchBuyOrder(pointer, baseDecimal) : matchSellOrder(pointer, baseDecimal);
    }

    function inserOrder(Order memory newOrder, bool isBuyOrder) private returns(uint pointer){
        Order[] storage order = isBuyOrder ? buyOrders : sellOrders;

        pointer = order.length;
        order.push(newOrder);
        while(pointer > 0 && order[pointer - 1].price < newOrder.price){
            order[pointer] = order[pointer - 1];
            pointer--;
        }
        order[pointer] = newOrder;
    }

    function matchBuyOrder(uint index, uint baseDecimal) internal {
        Order storage buyOrder = buyOrders[index];
        if(sellOrders.length < 1 || buyOrder.price < sellOrders[sellOrders.length - 1].price) return;
        uint i = sellOrders.length;
        while(i > 0 && sellOrders[i - 1].price <= buyOrder.price){
            Order storage sellOrder = sellOrders[i - 1];
            
            uint256 quantity = (buyOrder.quantity < sellOrder.quantity) ? buyOrder.quantity : sellOrder.quantity;
            buyOrder.quantity -= quantity;
            sellOrder.quantity -= quantity;

            uint diff = buyOrder.price - sellOrder.price;
            IOrderbookFactory(i_factory).updateBalance(buyOrder.trader, _quote, ((diff * quantity) / baseDecimal));

            IOrderbookFactory(i_factory).updateBalance(buyOrder.trader, _base, quantity);
            IOrderbookFactory(i_factory).updateBalance(sellOrder.trader, _quote, (quantity * sellOrder.price / baseDecimal));

            if(sellOrder.quantity == 0){
                sellOrders.pop();
                i--;
            }

            if(buyOrder.quantity == 0){
                buyOrders.pop();
                break;
            }
        }
    }
    
    function matchSellOrder(uint index, uint baseDecimal) internal {
        Order storage sellOrder = sellOrders[index];
        if(buyOrders.length < 1 || sellOrder.price > buyOrders[buyOrders.length - 1].price) return;
        uint i = buyOrders.length;
        while(i > 0 && buyOrders[i - 1].price >= sellOrder.price){
            Order storage buyOrder = buyOrders[i - 1];
            
            uint256 quantity = (sellOrder.quantity > buyOrder.quantity) ? buyOrder.quantity : sellOrder.quantity;
            sellOrder.quantity -= quantity;
            buyOrder.quantity -= quantity;

            uint diff = buyOrder.price - sellOrder.price;
            IOrderbookFactory(i_factory).updateBalance(buyOrder.trader, _quote, ((diff * quantity) / baseDecimal));


            IOrderbookFactory(i_factory).updateBalance(buyOrder.trader, _base, quantity);
            IOrderbookFactory(i_factory).updateBalance(sellOrder.trader, _quote, (quantity * sellOrder.price / baseDecimal));
            

            if(buyOrder.quantity == 0){
                buyOrders.pop();
                i--;
            }

            if(sellOrder.quantity == 0){
                sellOrders.pop();
                break;
            }
        }
        
    }

    function buyAtMarketPrice(address _user, uint _total) public onlyOwner {
        require(sellOrders.length > 0, "no sell orders present");
        uint baseDecimal = 10 ** IERC20(_base).decimals();
        while(_total > 0 && sellOrders.length > 0){
            Order storage sellOrder = sellOrders[sellOrders.length - 1];
            uint sellOrderTotal = sellOrder.price * sellOrder.quantity / baseDecimal;

            if(_total >= sellOrderTotal){
                IOrderbookFactory(i_factory).updateBalance(_user, _base, sellOrder.quantity);
                IOrderbookFactory(i_factory).deductBalance(_user, _quote, sellOrderTotal);
                IOrderbookFactory(i_factory).updateBalance(sellOrder.trader, _quote, sellOrderTotal);

                _total = _total - sellOrderTotal;
                sellOrders.pop();
            }else{
                uint quantity = _total * baseDecimal / sellOrder.price; // formula to get the amount of _base, if _quote amount of buyer is less than the sender
                uint amount = quantity * sellOrder.price / baseDecimal;
                
                IOrderbookFactory(i_factory).updateBalance(_user, _base, quantity);
                IOrderbookFactory(i_factory).deductBalance(_user, _quote, amount);
                IOrderbookFactory(i_factory).updateBalance(sellOrder.trader, _quote, amount);

                sellOrder.quantity -= quantity;
                _total = 0;
            }
        }
    } 

    function sellAtMarketPrice(address _user, uint _total) public {
        require(buyOrders.length > 0, "no buyers orders present");
        uint baseDecimal = 10 ** IERC20(_base).decimals();
        while(_total > 0 && buyOrders.length > 0){
            Order storage buyOrder = buyOrders[buyOrders.length - 1];
            uint buyOrderTotal = buyOrder.price * buyOrder.quantity / baseDecimal;

            if(_total >= buyOrder.quantity){

                IOrderbookFactory(i_factory).updateBalance(_user, _quote, buyOrderTotal);
                IOrderbookFactory(i_factory).deductBalance(_user, _base, buyOrder.quantity);
                IOrderbookFactory(i_factory).updateBalance(buyOrder.trader, _base, buyOrder.quantity);

                _total = _total - buyOrder.quantity;
                buyOrders.pop();
            }else{
                uint amount = _total * buyOrder.price / baseDecimal;

                IOrderbookFactory(i_factory).updateBalance(_user, _quote, amount);
                IOrderbookFactory(i_factory).deductBalance(_user, _base, _total);
                IOrderbookFactory(i_factory).updateBalance(buyOrder.trader, _base, _total);

                buyOrder.quantity -= _total;
                _total = 0;
            }
        }
    } 

}