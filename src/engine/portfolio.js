// ============================================================
// TraderPro — Portfolio Management Engine
// Tracks positions, P&L, and performance metrics
// ============================================================

class Portfolio {
    constructor() {
        this.balance = 100000; // Starting virtual balance
        this.positions = [];
        this.closedTrades = [];
        this.equityHistory = [{ time: Date.now(), equity: this.balance }];
    }

    /**
     * Open a new position
     */
    openPosition(symbol, type, price, quantity, signal) {
        const position = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            symbol,
            type, // 'LONG' or 'SHORT'
            entryPrice: price,
            quantity,
            currentPrice: price,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
            openTime: Date.now(),
            signal,
            stopLoss: type === 'LONG' ? price * 0.97 : price * 1.03,
            takeProfit: type === 'LONG' ? price * 1.05 : price * 0.95,
        };
        this.positions.push(position);
        this.balance -= price * quantity;
        return position;
    }

    /**
     * Close an existing position
     */
    closePosition(positionId, exitPrice) {
        const idx = this.positions.findIndex(p => p.id === positionId);
        if (idx === -1) return null;
        const position = this.positions.splice(idx, 1)[0];
        const pnl = position.type === 'LONG'
            ? (exitPrice - position.entryPrice) * position.quantity
            : (position.entryPrice - exitPrice) * position.quantity;
        const trade = {
            ...position,
            exitPrice,
            realizedPnL: pnl,
            realizedPnLPercent: (pnl / (position.entryPrice * position.quantity)) * 100,
            closeTime: Date.now(),
            duration: Date.now() - position.openTime,
        };
        this.closedTrades.push(trade);
        this.balance += exitPrice * position.quantity + pnl;
        return trade;
    }

    /**
     * Update live prices for open positions
     */
    updatePrices(priceMap) {
        for (const position of this.positions) {
            if (priceMap[position.symbol] !== undefined) {
                position.currentPrice = priceMap[position.symbol];
                position.unrealizedPnL = position.type === 'LONG'
                    ? (position.currentPrice - position.entryPrice) * position.quantity
                    : (position.entryPrice - position.currentPrice) * position.quantity;
                position.unrealizedPnLPercent =
                    (position.unrealizedPnL / (position.entryPrice * position.quantity)) * 100;
            }
        }
        // Record equity
        const equity = this.getEquity();
        const lastRecord = this.equityHistory[this.equityHistory.length - 1];
        if (!lastRecord || Date.now() - lastRecord.time > 60000) {
            this.equityHistory.push({ time: Date.now(), equity });
        }
    }

    /**
     * Auto-trade based on signals (demo mode)
     */
    autoTrade(symbol, analysis, currentPrice) {
        if (!analysis || !currentPrice) return null;

        // Check if we should close any position
        const existingPosition = this.positions.find(p => p.symbol === symbol);
        if (existingPosition) {
            // Close if signal reversed or stop/take hit
            const shouldClose =
                (existingPosition.type === 'LONG' && analysis.decision.includes('SELL')) ||
                (existingPosition.type === 'SHORT' && analysis.decision.includes('BUY')) ||
                (existingPosition.type === 'LONG' && currentPrice <= existingPosition.stopLoss) ||
                (existingPosition.type === 'SHORT' && currentPrice >= existingPosition.stopLoss) ||
                (existingPosition.type === 'LONG' && currentPrice >= existingPosition.takeProfit) ||
                (existingPosition.type === 'SHORT' && currentPrice <= existingPosition.takeProfit);

            if (shouldClose) {
                return { action: 'CLOSE', trade: this.closePosition(existingPosition.id, currentPrice) };
            }
            return null;
        }

        // Open new position if signal is strong enough
        if (analysis.confidence >= 60 && this.balance > 0) {
            const riskAmount = this.balance * 0.02; // 2% risk per trade
            const quantity = riskAmount / currentPrice;

            if (analysis.decision === 'STRONG BUY' || analysis.decision === 'BUY') {
                return {
                    action: 'OPEN',
                    trade: this.openPosition(symbol, 'LONG', currentPrice, quantity, analysis.decision),
                };
            } else if (analysis.decision === 'STRONG SELL' || analysis.decision === 'SELL') {
                return {
                    action: 'OPEN',
                    trade: this.openPosition(symbol, 'SHORT', currentPrice, quantity, analysis.decision),
                };
            }
        }
        return null;
    }

    /**
     * Get total equity (balance + unrealized P&L)
     */
    getEquity() {
        const unrealizedPnL = this.positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
        return this.balance + this.positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        const equity = this.getEquity();
        const initialBalance = 100000;
        const totalReturn = ((equity - initialBalance) / initialBalance) * 100;
        const totalTrades = this.closedTrades.length;
        const winningTrades = this.closedTrades.filter(t => t.realizedPnL > 0).length;
        const losingTrades = this.closedTrades.filter(t => t.realizedPnL < 0).length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const totalPnL = this.closedTrades.reduce((sum, t) => sum + t.realizedPnL, 0);
        const avgWin = winningTrades > 0
            ? this.closedTrades.filter(t => t.realizedPnL > 0).reduce((s, t) => s + t.realizedPnL, 0) / winningTrades
            : 0;
        const avgLoss = losingTrades > 0
            ? Math.abs(this.closedTrades.filter(t => t.realizedPnL < 0).reduce((s, t) => s + t.realizedPnL, 0) / losingTrades)
            : 0;
        const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

        // Max drawdown
        let maxDrawdown = 0;
        let peak = initialBalance;
        for (const point of this.equityHistory) {
            if (point.equity > peak) peak = point.equity;
            const drawdown = ((peak - point.equity) / peak) * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        // Sharpe ratio (simplified)
        const returns = [];
        for (let i = 1; i < this.equityHistory.length; i++) {
            returns.push(
                (this.equityHistory[i].equity - this.equityHistory[i - 1].equity) / this.equityHistory[i - 1].equity
            );
        }
        const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const stdReturn = returns.length > 1
            ? Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (returns.length - 1))
            : 0;
        const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

        return {
            equity,
            balance: this.balance,
            totalReturn,
            totalTrades,
            winningTrades,
            losingTrades,
            winRate,
            totalPnL,
            avgWin,
            avgLoss,
            profitFactor,
            maxDrawdown,
            sharpeRatio,
            openPositions: this.positions.length,
            unrealizedPnL: this.positions.reduce((s, p) => s + p.unrealizedPnL, 0),
        };
    }

    /**
     * Get recent trades
     */
    getRecentTrades(count = 10) {
        return this.closedTrades.slice(-count).reverse();
    }
}

// Singleton portfolio
export const portfolio = new Portfolio();
