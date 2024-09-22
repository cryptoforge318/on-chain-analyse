import axios from "axios";
import dotenv from "dotenv";
import { Pool } from "pg";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import { GoogleAuth } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

interface DBConfig {
  user: string;
  password: string;
  database: string;
  host: string;
  port: number;
}

export const connectWithConnector = async (): Promise<Pool> => {
  const connector = new Connector();
  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  const credentialsFilePath = "adc.json";

  if (!instanceConnectionName) {
    throw new Error(
      "INSTANCE_CONNECTION_NAME is not set in environment variables"
    );
  }

  // Set environment variable for Google Application Credentials
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
    __dirname,
    credentialsFilePath
  );

  // Authenticate with Google Cloud using the service account JSON file
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  // Authenticate the client
  await auth.getClient();

  const clientOpts = await connector.getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC,
  });

  const dbConfig: DBConfig = {
    user: process.env.DB_USER as string,
    password: process.env.DB_PASS as string,
    database: process.env.DB_NAME as string,
    host: process.env.DB_HOST as string,
    port: 5432,
  };

  const pool = new Pool(dbConfig);
  return pool;
};

export const networkName = (): { [key: string]: string } => {
  const names: { [key: string]: string } = {
    "binance-smart-chain": "bsc-mainnet",
    ethereum: "eth-mainnet",
    "polygon-pos": "matic-mainnet",
    "x-dai": "gnosis-mainnet",
  };

  return names;
};

export const getFormattedDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export async function fetchTokenHolders(
  network: string,
  tokenCA: string,
  date: string
) {
  console.log("Fetching for:", tokenCA, date);
  const url = `https://api.covalenthq.com/v1/${network}/tokens/${tokenCA}/token_holders_v2/?date=${date}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.COVALENT_API_KEY}`,
      },
    });

    const data = response.data.data.pagination.total_count;
    return data;
  } catch (error) {
    console.error("Error fetching token holders:", error);
    return null;
  }
}

export const fetchCoinData = async () => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/list?include_platform=true`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "x-cg-pro-api-key": process.env.COINGEKCO_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};
