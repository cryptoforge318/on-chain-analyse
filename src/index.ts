import express from "express";
import dotenv from "dotenv";
import { fetchTokenHolders, getFormattedDate, fetchCoinData } from "./utils";
import { Client } from "pg";

dotenv.config();

interface Coin {
  id: string;
  symbol: string;
  name: string;
  platforms: { [key: string]: string };
}

let coinData: Coin[] = [];

const getContractAddress = (platforms: { [key: string]: string }): string | undefined => {
  const firstKey = Object.keys(platforms)[0];
  return firstKey ? platforms[firstKey] : undefined;
};

const saveHolderDataToDB = async (holderDataBatch: any[]) => {
  const client = new Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: Number(process.env.PG_PORT) || 5432,
  });

  try {
    await client.connect();
    const query = `INSERT INTO token_holders (token_address, date, holder_count) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`;
    for (const data of holderDataBatch) {
      await client.query(query, [data.tokenAddress, data.date, data.holderCount]);
    }
  } catch (error) {
    console.error("Error saving to database:", error);
  } finally {
    await client.end();
  }
};

const fetchHolderData = async (contractAddress: string) => {
  let dateIterator = new Date();
  const holderDataBatch: any[] = [];

  while (true) {
    const holderCount = await fetchTokenHolders(contractAddress, getFormattedDate(dateIterator));
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
        await fetchHolderData(contractAddress);
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
