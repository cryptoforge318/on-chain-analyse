import express from "express";
import dotenv from "dotenv";

import {
  fetchTokenHolders,
  getFormattedDate,
  fetchCoinData,
  networkName,
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
  tokenAddress: string;
  date: string; // Assuming date is a string formatted as 'YYYY-MM-DD'
  holderCount: number;
}

let coinData: Coin[] = []; //All coinData fetched from CoinGecko
let client: PoolClient | undefined; //PostgresSQL connection client

const getContractAddress = (platforms: {
  [key: string]: string;
}): [string, string] | undefined => {
  const networkMap = networkName();
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

const saveHolderDataToDB = async (holderDataBatch: HolderData[]) => {
  if (!client) {
    console.error("Database client is not initialized.");
    return;
  }

  try {
    await client.query("BEGIN");

    for (const holderData of holderDataBatch) {
      const { tokenAddress, date, holderCount } = holderData;
      const result = await client.query(
        `SELECT 1 FROM holders WHERE tokenAddress = $1 AND date = $2`,
        [tokenAddress, date]
      );
      if (result.rows.length === 0) {
        await client.query(
          `INSERT INTO holders (tokenAddress, date, holder)
           VALUES ($1, $2, $3)`,
          [tokenAddress, date, holderCount]
        );
      }
    }

    await client.query("COMMIT");
    console.log("Data saved successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error saving data, transaction rolled back:", err);
  }
};

const fetchHolderData = async (
  networkName: string,
  contractAddress: string
) => {
  let dateIterator = new Date();
  const holderDataBatch: any[] = [];
  while (true) {
    const holderCount = await fetchTokenHolders(
      networkName,
      contractAddress,
      getFormattedDate(dateIterator)
    );
    if (holderCount === null) {
      break;
    } else {
      holderDataBatch.push({
        tokenAddress: contractAddress,
        date: getFormattedDate(dateIterator),
        holderCount: holderCount,
      });
      dateIterator.setDate(dateIterator.getDate() - 1);
    }
  }

  await saveHolderDataToDB(holderDataBatch);
};

const fetchData = async () => {
  try {
    coinData = await fetchCoinData();
    for (let i = 0; i < coinData.length; i++) {
      const platforms = coinData[i].platforms;
      const contractAddress = getContractAddress(platforms);

      if (contractAddress) {
        const [networkName, address] = contractAddress;
        if (networkName === "eth-mainnet") {
          await fetchHolderData(networkName, address);
        }
        // console.log(networkName, address);
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
