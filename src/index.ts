import express from "express";
import dotenv from "dotenv";

import {
  getFormattedDate,
  fetchCoinData,
  getNetworkName,
  ankrGetHolderHistory,
  fetchContractInfo,
  connectWithConnector,
} from "./utils";
import { PoolClient } from "pg";

dotenv.config();

interface Coin {
  id: string;
  symbol: string;
  name: string;
  platforms: { [key: string]: string };
}

interface HolderData {
  network: string;
  tokenAddress: string;
  date: number;
  holderCount: any;
}

interface CoinInfo {
  coinId: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  image_url: string;
  total_supply: number;
  price_usd: number;
  fdv_usd: number;
  total_reserve_in_usd: number;
  volume_usd: number;
  market_cap_usd: number;
}

let coinData: Coin[] = []; //All coinData fetched from CoinGecko
let client: PoolClient | undefined;

const getContractAddress = (platforms: {
  [key: string]: string;
}): [string, string] | undefined => {
  const networkMap = getNetworkName();
  for (const platform in platforms) {
    if (networkMap[platform]) {
      return [networkMap[platform], platforms[platform]];
    }
  }

  return undefined;
};

const connectDB = async () => {
  try {
    const pool = await connectWithConnector();
    client = await pool.connect();
    console.log("Connected to the PostgreSQL database successfully.");
  } catch (err) {
    console.error("Error connecting to the PostgreSQL database:", err);
  }
};

const saveHolderDataToDB = async (
  holderDataBatch: HolderData[],
  coinInfoData: CoinInfo | null
) => {
  if (!client) {
    console.error("Database client is not initialized.");
    return;
  }

  try {
    await client.query("BEGIN");

    let contractAddress;
    for (let i = 0 ; i < holderDataBatch.length; i++) {
      const { network, tokenAddress, date, holderCount } = holderDataBatch[i];
      // console.log(holderDataBatch[i]);
      contractAddress = tokenAddress;
      const result = await client.query(
        `SELECT 1 FROM holders WHERE network = $1 AND tokenAddress = $2 AND date = $3`,
        [network, tokenAddress, date]
      );
      if (result.rows.length === 0) {
        await client.query(
          `INSERT INTO holders (network, tokenaddress, date, holder)
           VALUES ($1, $2, $3, $4)`,
          [network, tokenAddress, date, holderCount]
        );
      }
      console.log(i);
    }

    console.log('!!!', contractAddress);

    if (coinInfoData !== null) {
      const {
        coinId,
        address,
        name,
        symbol,
        decimals,
        image_url,
        total_supply,
        price_usd,
        fdv_usd,
        total_reserve_in_usd,
        volume_usd,
        market_cap_usd,
      } = coinInfoData;
      const result = await client.query(
        `SELECT 1 FROM token_data WHERE address = $1`,
        [address]
      );
      if (result.rows.length === 0) {
        await client.query(
          `INSERT INTO token_data (coinid, address, name, symbol, decimals, image_url, total_supply, price_usd, fdv_usd, total_reserve_in_usd, volume_usd, market_cap_usd)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            coinId,
            address,
            name,
            symbol,
            decimals,
            image_url,
            total_supply,
            price_usd,
            fdv_usd,
            total_reserve_in_usd,
            volume_usd,
            market_cap_usd,
          ]
        );
      }
    }

    await client.query("COMMIT");
    console.log("Data saved successfully for", contractAddress);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error saving data, transaction rolled back:", err);
  }
};

const fetchHolderData = async (
  networkName: string,
  contractAddress: string
) => {
  try {
    let holdersData: HolderData[] = [];
    let holderhistory = await ankrGetHolderHistory(
      contractAddress,
      networkName
    );

    for (let i = 0; i < holderhistory.holderCountHistory.length; i++) {
      holdersData.push({
        network: networkName,
        tokenAddress: contractAddress,
        date: holderhistory.holderCountHistory[i].lastUpdatedAt,
        holderCount: holderhistory.holderCountHistory[i].holderCount,
      });
    }

    let coinInfo: CoinInfo | null = null; // Initialize coinInfo with null
    try {
      let coin = await fetchContractInfo(networkName, contractAddress);
      coinInfo = {
        coinId: coin.id,
        address: coin.attributes.address,
        name: coin.attributes.name,
        symbol: coin.attributes.symbol,
        decimals: coin.attributes.decimals,
        image_url: coin.attributes.image_url,
        total_supply: coin.attributes.total_supply,
        price_usd: coin.attributes.price_usd,
        fdv_usd: coin.attributes.fdv_usd,
        total_reserve_in_usd: coin.attributes.total_reserve_in_usd,
        volume_usd: coin.attributes.volume_usd.h24,
        market_cap_usd:
          coin.attributes.market_cap_usd ??
          (coin.attributes.total_supply /
            Math.pow(10, coin.attributes.decimals)) *
            coin.attributes.price_usd,
      };
    } catch (error) {
      console.log("coinInfo fetch error: ", networkName, contractAddress);
    }

    await saveHolderDataToDB(holdersData, coinInfo);
  } catch (error) {
    console.log("holder fetch error: ", error, networkName, contractAddress);
  }
};

const fetchData = async () => {
  try {
    coinData = await fetchCoinData();
    for (let i = 0; i < coinData.length; i++) {
      const platforms = coinData[i].platforms;
      const contractAddress = getContractAddress(platforms);

      if (contractAddress) {
        const [networkName, address] = contractAddress;
        if (networkName) {
          if (!client) {
            console.error("Database client is not initialized.");
            return;
          }
          const result = await client.query(
            `SELECT 1 FROM holders WHERE network = $1 AND tokenAddress = $2`,
            [networkName, address]
          );
          if (result.rows.length === 0) {
            await fetchHolderData(networkName, address);
          }
        }
      } else {
        console.warn(`No contract address found for ${coinData[i].name}`);
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

const main = async () => {
  await connectDB();

  fetchData();
};

const app = express();
const port = process.env.PORT || 3000;
// Route to handle root requests
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  main();
});
