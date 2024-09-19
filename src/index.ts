import express from "express";
import dotenv from "dotenv";

import {
  fetchTokenHolders,
  getFormattedDate,
  fetchCoinData,
  networkName,
  connectWithConnector,
} from "./utils";
import { Client } from "pg";

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

let coinData: Coin[] = [];

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

const classifyByNetwork = (data: Coin[]) => {
  const result: { [key: string]: Coin[] } = {};

  data.forEach((coin) => {
    const platforms = coin.platforms;
    Object.keys(platforms).forEach((network) => {
      if (!result[network]) {
        result[network] = [];
      }
      result[network].push(coin);
    });
  });

  return result;
};

export const saveHolderDataToDB = async (holderDataBatch: HolderData[]) => {
  try {
    const pool = await connectWithConnector();
    console.log("Connected to the PostgreSQL database successfully.");

    const client = await pool.connect();
    console.log("Obtained connection from pool.");

    try {
      await client.query("BEGIN"); // Start the transaction

      // Loop through holderDataBatch and insert data into the database
      for (const holderData of holderDataBatch) {
        const { tokenAddress, date, holderCount } = holderData;

        // Insert holder data into the 'holders' table
        await client.query(
          `INSERT INTO holders (tokenAddress, date, holder) VALUES ($1, $2, $3)`,
          [tokenAddress, date, holderCount]
        );
      }

      await client.query("COMMIT"); // Commit the transaction
      console.log("Data saved successfully.");
    } catch (err) {
      await client.query("ROLLBACK"); // Rollback the transaction in case of error
      console.error("Error saving data, transaction rolled back:", err);
    } finally {
      client.release(); // Always release the connection back to the pool
    }
  } catch (err) {
    console.error("Error connecting to the PostgreSQL database:", err);
  }
};

const fetchHolderData = async (
  networkName: string,
  contractAddress: string
) => {
  let dateIterator = new Date();
  const holderDataBatch: any[] = [];
  let limit = 0;
  while (true) {
    const holderCount = await fetchTokenHolders(
      networkName,
      contractAddress,
      getFormattedDate(dateIterator)
    );
    limit++;
    if (holderCount === null || limit === 3) {
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
    // const classifiedByNetwork = classifyByNetwork(coinData);
    // console.log(Object.keys(classifiedByNetwork));
    let count = 0;
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

fetchData();

const app = express();
const port = process.env.PORT || 3000;

// Route to handle root requests
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
