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
export const getNetworkName = (): { [key: string]: string } => {
  const names: { [key: string]: string } = {
    "arbitrum-one": "arbitrum",
    avalanche: "avalanche",
    base: "base",
    "binance-smart-chain": "bsc",
    ethereum: "eth",
    fantom: "fantom",
    "flare-network": "flare",
    "polygon-pos": "polygon",
    "polygon-zkevm": "polygon_zkevm",
    "x-dai": "gnosis",
    linea: "linea",
    rollux: "rollux",
    scroll: "scroll",
    stellar: "stellar",
    syscoin: "syscoin",
    telos: "telos",
    xai: "xai",
    "x-layer": "xlayer",
    "optimistic-ethereum": "optimism",
  };

  return names;
};

export const getFormattedDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const ankrGetHolderHistory = async (contractAddress: string, network: string) => {
  const data = JSON.stringify({
    id: 1,
    jsonrpc: "2.0",
    method: "ankr_getTokenHoldersCount",
    params: {
      blockchain: network,
      contractAddress: contractAddress,
      pageSize: 20000,
    },
  });
  const options = {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    data,
  };

  try {
    const response = await axios(
      "https://rpc.ankr.com/multichain/79258ce7f7ee046decc3b5292a24eb4bf7c910d7e39b691384c7ce0cfb839a01/?ankr_getTokenHoldersCount",
      options
    );
    return response.data.result;
  } catch (error) {
    console.error("Error fetching data from Ankr API:", network, contractAddress);
    throw error;
  }
};

export const fetchContractInfo = async (network: string, contractAddress: string) => {
  try {
    if (network === 'polygon') network = "polygon_pos";
    if (network === 'avalanche') network = "avax";
    const response = await axios.get(
      `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${contractAddress}?include=included`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error coin info fetching data:", network, contractAddress);
    throw error;
  }
};

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
