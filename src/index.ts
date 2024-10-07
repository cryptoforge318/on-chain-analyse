import express from "express";
import dotenv from "dotenv";

import {
  getFormattedDate,
  fetchCoinData,
  getNetworkName,
  ankrGetHolderHistory,
  fetchContractInfo,
  fetchRecentCoinData,
} from "./utils";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

interface Coin {
  id: string;
  symbol: string;
  name: string;
  platforms: { [key: string]: string };
}

interface HolderData {
  tokenAddress: string;
  latestHoldersCount: number;
  holdersHistory: any;
  tokenInfo: any;
}

let coinData: Coin[] = []; //All coinData fetched from CoinGecko

const readFile = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent);
  } else {
    return []; // Return empty array if file doesn't exist
  }
};

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

const fetchHolderData = async (
  data2: any,
  networkName: string,
  contractAddress: string
) => {
  const filePath = "data2.json";

  try {
    let holderhistory = await ankrGetHolderHistory(
      contractAddress,
      networkName
    );

    let coinInfo = null; // Initialize coinInfo with null

    try {
      coinInfo = await fetchContractInfo(networkName, contractAddress);
    } catch (error) {
      console.log("coinInfo fetch error: ", networkName, contractAddress);
    }

    const holderData = {
      tokenAddress: contractAddress,
      latestHoldersCount: holderhistory.latestHoldersCount,
      holdersHistory: holderhistory.holderCountHistory,
      tokenInfo: coinInfo,
    };

    data2.push(holderData);
    fs.writeFileSync(filePath, JSON.stringify(data2, null, 2), "utf-8");
    console.log("Data saved successfully for ", contractAddress);
    return data2;
  } catch (error) {
    console.log("holder fetch error: ", error, networkName, contractAddress);
    return data2;
  }
};

const fetchData = async () => {
  try {
    coinData = await fetchCoinData();
    let currentData = readFile("data2.json");
    for (let i = 0; i < coinData.length; i++) {
      const platforms = coinData[i].platforms;
      const contractAddress = getContractAddress(platforms);
      if (contractAddress) {
        const [networkName, address] = contractAddress;
        if (networkName) {
          if (
            !currentData.some(
              (item: HolderData) => item.tokenAddress === address
            )
          ) {
            currentData = await fetchHolderData(
              currentData,
              networkName,
              address
            );
          }
        }
      } else {
        console.warn(`No contract address found for ${coinData[i].name}`);
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
  console.log("ended!!!!!");
};

const fetchRecentData = async () => {
  try {
    let recentCoinData = await fetchRecentCoinData();
    let data1 = readFile("data1.json");
    let data2 = readFile("data2.json");
    // for (let i = 0; i < recentCoinData.length; i++) {
    // const id: string = recentCoinData[i].id;
    // const args = id.split('_');
    // const networkName = args[0];
    // const contractAddress = args[1];
    const networkName = "eth";
    const contractAddress = "0xdb75d7d9174d22043b1fa65bf6452ac375b9a4bf";
    if (contractAddress) {
      if (networkName) {
        const tokenData1 = data1.some(
          (item: HolderData) => item.tokenAddress === contractAddress
        );
        const tokenData2 = data2.some(
          (item: HolderData) => item.tokenAddress === contractAddress
        );
        if (!(tokenData1 && tokenData2)) {
          data2 = await fetchHolderData(data2, networkName, contractAddress);
        }
      }
    } else {
      // console.warn(`No contract address found for ${coinData[i].name}`);
    }
    // }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
  console.log("ended!!!!!");
};

const main = async () => {
  fetchData();
  // fetchRecentData();
};

const app = express();
const port = process.env.PORT || 3333;
// Route to handle root requests
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  main();
});
