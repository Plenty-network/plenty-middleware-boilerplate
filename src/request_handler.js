const request = require("graphql-request").request;
const gql = require("graphql-request").gql;
const fs = require("fs");
const config = require("../config");

const queryTokenData = gql`
  {
    plenty_stats(limit: 1, order_by: { level: desc }) {
      id
      level
      liquidity
      liquidity_change
      price
      price_change_percentage
      symbol_plenty
      timestamp
      volume_change_percentage
      volume_token
    }
    token_stats(order_by: { level: desc }, limit: 200) {
      id
      symbol_token
      token_price
      timestamp
      level
      liquidity
      liquidity_change
      price_change_percentage
      volume_change_percentage
      volume_token
    }
  }
`;

const queryToken7DaysData = (date) => gql`
  {
    token_stats(
      order_by: { level: asc }
      where: {
        timestamp: {
          _gte: "${new Date(new Date(date) - 3600000 * 4).toUTCString()}"
          _lte: "${date.toUTCString()}"
        }
      }
    ) {
      id
      symbol_token
      token_price
      timestamp
      level
      liquidity
      liquidity_change
      price_change_percentage
      volume_change_percentage
      volume_token
    }
    plenty_stats(
      order_by: { level: asc }
      limit: 1
      where: {
        timestamp: {
          _gte: "${new Date(new Date(date) - 3600000 * 2).toUTCString()}"
          _lte: "${date.toUTCString()}"
        }
      }
    ) {
      id
      level
      liquidity
      liquidity_change
      price
      price_change_percentage
      symbol_plenty
      timestamp
      volume_change_percentage
      volume_token
    }
  }
`;

module.exports.startRequestHandler = () => {
  start24HourDataHandler();
  start7DaysDataHandler();
  setInterval(() => {
    start24HourDataHandler();
    start7DaysDataHandler();
  }, 60000);
};

async function start7DaysDataHandler() {
  var last7DayDate = new Date();
  var data = [];
  var promises = [];
  for (let i = 0; i < 42; i++) {
    promises.push(
      request(
        `${config.GRAPHQL_API}/v1/graphql`,
        queryToken7DaysData(last7DayDate)
      )
    );
    last7DayDate = new Date(last7DayDate - 1 * 4 * 60 * 60 * 1000);
  }
  var results = await Promise.allSettled(promises);
  for (let i = 0; i < results.length; i++) {
    const element = results[i].value;
    try{
      data = data.concat(filterTokensData(element));
    } catch(error) {
      console.log(error);
    }
  }

  fs.writeFileSync(
    "tokens_price_scatter.json",
    JSON.stringify(groupByTokenName(data))
  );
}

function groupByTokenName(data) {
  var tokensGroup = {};
  for (let i = 0; i < data.length; i++) {
    const element = data[i];
    if (tokensGroup[element.symbol_token]) {
      tokensGroup[element.symbol_token].push({
        time: new Date(element.timestamp).getTime(),
        value: element.token_price,
      });
    } else {
      tokensGroup[element.symbol_token] = [];
      tokensGroup[element.symbol_token].push({
        time: new Date(element.timestamp).getTime(),
        value: element.token_price,
      });
    }
  }
  return tokensGroup;
}

function start24HourDataHandler() {
  request(`${config.GRAPHQL_API}/v1/graphql`, queryTokenData).then(
    async (data) => {
      try {
        data = filterTokensData(data);
      } catch(error) {
        console.log(error);
      }
      fs.writeFileSync("tokens_statistical_data.json", JSON.stringify(data));
    }
  );
}

function formatPlentyStates(data) {
  return {
    id: data.id,
    symbol_token: data.symbol_plenty,
    token_price: data.price,
    timestamp: data.timestamp,
    level: data.level,
    liquidity: data.liquidity,
    liquidity_change: data.liquidity_change,
    price_change_percentage: data.price_change_percentage,
    volume_change_percentage: data.volume_change_percentage,
    volume_token: data.volume_token,
  };
}

function filterTokensData(data) {
  const token_names = [];
  const tokens = [];
  for (let i = 0; i < data.token_stats.length; i++) {
    const element = data.token_stats[i];
    if (!token_names.includes(element.symbol_token)) {
      token_names.push(element.symbol_token);
      tokens.push(element);
    }
  }
  tokens.push(formatPlentyStates(data.plenty_stats[0]));
  return tokens;
}
