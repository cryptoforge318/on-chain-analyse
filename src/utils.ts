import axios from "axios";
import dotenv from "dotenv";
import { Pool } from "pg"; // Import pg Pool
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

export const connectWithConnector = async (
  config?: DBConfig,
  credentialsFilePath: string = "adc.json"
): Promise<Pool> => {
  const connector = new Connector();
  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;

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
    scopes: ["https://www.googleapis.com/auth/cloud-platform"], // Scope for Cloud SQL access
  });

  // Authenticate the client
  await auth.getClient();

  // Get the Cloud SQL connection options for PostgreSQL
  const clientOpts = await connector.getOptions({
    instanceConnectionName, // Your instance connection name
    ipType: IpAddressTypes.PUBLIC, // Use Public IP for the connection
  });

  // Prepare the database configuration for PostgreSQL
  const dbConfig: DBConfig = {
    user: process.env.DB_USER as string, // Your DB user
    password: process.env.DB_PASS as string, // Your DB password
    database: process.env.DB_NAME as string, // Your DB name
    host: "34.29.242.105", // Use the host provided by the Cloud SQL connector
    port: 5432, // PostgreSQL default port
  };

  // Establish a connection to the PostgreSQL database using a connection pool
  const pool = new Pool(dbConfig);
  return pool;
};

export const networkName = (): { [key: string]: string } => {
  const names: { [key: string]: string } = {
    "binance-smart-chain": "bsc-mainnet",
    ethereum: "eth-mainnet",
    "polygon-pos": "matic-mainnet",
    "optimistic-ethereum": "optimism-mainnet",
    avalanche: "avalanche-mainnet",
    fantom: "fantom-mainnet",
    "arbitrum-one": "arbitrum-mainnet",
    "arbitrum-nova": "arbitrum-nova-mainnet",
    aurora: "aurora-mainnet",
    base: "base-mainnet",
    beam: "avalanche-beam-mainnet",
    blast: "blast-mainnet",
    boba: "boba-mainnet",
    canto: "canto-mainnet",
    celo: "celo-mainnet",
    cronos: "cronos-mainnet",
    evmos: "evmos-mainnet",
    energi: "energi-mainnet",
    "flare-network": "flarenetworks-flare-mainnet",
    fraxtal: "fraxtal-mainnet",
    "harmony-shard-0": "harmony-mainnet",
    linea: "linea-mainnet",
    lisk: "lisk-mainnet",
    "manta-pacific": "manta-sepolia-testnet",
    mantle: "mantle-mainnet",
    "merlin-chain": "merlin-mainnet",
    meter: "meter-mainnet",
    "metis-andromeda": "metis-mainnet",
    "milkomeda-cardano": "milkomeda-c1-mainnet",
    mode: "mode-mainnet",
    moonbeam: "moonbeam-mainnet",
    moonriver: "moonbeam-moonriver",
    oasis: "emerald-paratime-mainnet",
    "oasis-sapphire": "oasis-sapphire-mainnet",
    oasys: "oasys-mainnet",
    opbnb: "bnb-opbnb-mainnet",
    rollux: "rollux-mainnet",
    rootstock: "rsk-mainnet",
    scroll: "scroll-mainnet",
    sei: "sei-mainnet",
    solana: "solana-mainnet",
    songbird: "flarenetworks-canary-mainnet",
    "sx-network": "sx-mainnet",
    taiko: "taiko-mainnet",
    telos: "telos-mainnet",
    "x-layer": "x1-mainnet",
    zetaChain: "zetachain-mainnet",
    zksync: "zksync-mainnet",
    "zora-network": "zora-mainnet",
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
    return null; // Handle errors gracefully and return null
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
