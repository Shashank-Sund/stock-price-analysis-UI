# How to use Stock Price Analysis

A quick guide to https://shaismarketpriceeda.com/.

## What is it?

You pick some stocks and a time period. The app grabs the real prices and turns them into charts and numbers that show how each stock did, how risky it was, and how it compares to the overall market.

**Why it's useful**

- **See how a stock did at a glance**, without building a spreadsheet.
- **See the risk, not just the gains.** Two stocks can both be up 20%, but one may have dropped 40% along the way. That matters if you're the one holding it.
- **Compare stocks** with each other and with the market.
- **Learn investing ideas** like volatility, drawdown and beta. Every number has a short plain-English explanation next to it.

It shows what already happened. It can't predict the future, and it isn't financial advice.

## Getting started

1. **Add tickers.** A ticker is a stock's short code, like `AAPL` for Apple or `TSLA` for Tesla. Type one in the Tickers box and press Enter or comma. You can add up to 10. Backspace removes the last one.
2. **Pick dates**, or click a **Quick range**: 1M, 6M, YTD (since January 1), 1Y or 5Y. Ranges can be up to 20 years.
3. Click **Analyze**. It usually takes a few seconds.

Your last 5 searches show up under **Recent**, so you can run them again with one click.

**What's SPY?** SPY is a fund that follows the S&P 500, which is 500 of the biggest US companies. Think of it as "the market". The app always adds SPY so you can tell whether a stock beat the market. It doesn't count toward your 10 tickers.

## The dashboard

### 1. Summary (top of the page)

With **one ticker** you get 8 cards. With **several**, you get a table with one row per ticker, plus SPY. Click a ticker's name in the table to show its charts.

| Card | What it tells you |
| --- | --- |
| Total return | How much the price went up or down from the first day to the last. |
| Annual return | The same thing as a yearly rate, so you can compare a 2 year range with a 10 year one. |
| Annual volatility | How much the price jumps around. Higher means a bumpier ride. |
| Sharpe | How much return you got for the bumpiness. Above 1 is strong. It assumes a 0% risk-free rate, so it's slightly flattering. |
| Max drawdown | The biggest drop from a high point to a later low, with the dates and whether the price has recovered since. |
| Best and worst day | The biggest one-day gain and the biggest one-day loss. |
| Period high and low | The highest and lowest closing prices, with their dates. |
| Versus SPY | **Beta** is how much the stock tends to move when the market moves 1%: 1.5 means it usually moves about 1.5%. **Return vs SPY** tells you whether it beat the market. |

Tip: tap or hover the small (i) icons for a quick explanation.

### 2. Price chart

- **Line or Candlesticks.** A line shows the closing price. Each candle shows one day (or one week). The box runs from the opening price to the closing price, and the thin lines show the high and the low. Hollow candles closed higher, filled ones closed lower.
- **50 day avg and 200 day avg** are smoothed lines that show the trend. A price above its 200 day line is often read as an uptrend.
- **Log scale** makes the same percentage move look the same size anywhere on the chart. It's useful for long ranges, where a $10 move back in 2010 meant much more than a $10 move today.
- **Volume bars** along the bottom show how many shares traded. Tall bars mean a lot of activity, often around big news.
- **Move around the chart:** drag to pan and scroll to zoom (on a phone, swipe and pinch). The reset button zooms back out. Hover over the chart to see the exact numbers.
- With several tickers, use the buttons above the chart to switch between them.

### 3. The four tabs

The Returns, Risk and Seasonality tabs show one ticker at a time. Use the buttons next to the tabs to pick which one.

**Returns: what a normal day looks like**

- **Histogram:** how many days the stock moved up or down by each amount. A tall, narrow shape means calm. A wide one means wild.
- **Normal curve** button: puts a perfect bell curve on top for comparison. Real stocks usually have more extreme days than the curve predicts.
- **95% VaR line** (value at risk): on 95% of days, the stock did better than this. It's a way to measure what a bad day looks like.
- **Stats table:** average day, middle day, typical move size, how lopsided the returns are, how often extreme days happen, and the share of days that went up. Each one comes with an explanation.

**Risk: when it got scary**

- **Rolling 30 day volatility:** how bumpy each stretch of about a month was. Spikes line up with turbulent times, like the 2020 crash. The dashed line is the average for the whole range.
- **Drawdown:** how far the price was below its highest point so far, at every moment. The worst drop is shaded, so you can see how deep it went and how long it took to come back.

**Seasonality: patterns by month**

- **Monthly returns heatmap:** each square is one month. Blue months went up and red months went down, and darker means a bigger move. The last column is the whole year. A `*` marks a month or year the date range only partly covers.
- **Average return by calendar month:** do some months tend to do better? It only counts full months. The more years you pick, the more you can trust it, so try 10 years or more.

**Compare: everything side by side**

- **Change since the start:** every ticker starts at 0%, so you can see who grew the most. SPY is the dashed gray line. Click a name in the legend to hide or show its line. There's a log scale button here too.
- **Correlation:** how closely two stocks move together. 1 means they always move together, and 0 means there's no connection. Stocks with low correlation are good for spreading out your risk, which is called diversification.
- **Risk versus return:** each dot is one ticker. Higher means more return, and further right means more bumpiness. Up and to the left is the best place to be.

### 4. Download CSV

The download button sits next to the Summary heading. With one ticker, the file has its data plus SPY's. With several, you can download the ticker you're viewing or all of them in one file. CSV files open in Excel or Google Sheets.

## Good to know

- **Dark mode:** the moon icon in the top right (it turns into a sun to switch back).
- **Phones:** everything works on a phone.
- **Long ranges:** over 5 years, the charts draw one bar per week so they load fast. You'll see a "Weekly bars" label when this happens. The numbers in the cards still use every single day.
- **Mistakes:** if a ticker doesn't exist or the dates are wrong, the app tells you what to fix.
- **How it's built:** the section at the bottom of the page explains the technology behind the app.

## Questions to try

| Question | Where to look |
| --- | --- |
| Did Apple beat the market last year? | `AAPL`, 1Y, then the **Versus SPY** card |
| Which of my stocks was the riskiest? | The **Volatility** column, or **Compare**, then **Risk versus return** |
| How bad was the 2020 crash, and how long did it take to recover? | Pick 2019 to 2022, then the **Max drawdown** card and **Risk**, then **Drawdown** |
| Do NVDA and AMD move together? | Both tickers, then **Compare**, then **Correlation** |
| Is there a "best month" to own a stock? | 10 years or more, then the **Seasonality** tab |
| Is the stock trending up? | **Price chart** with the **200 day avg** turned on |
