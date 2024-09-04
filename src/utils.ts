import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const getFormattedDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export async function fetchTokenHolders(tokenCA: string, date: string) {
  console.log('Fetching for:', tokenCA, date);
  const url = `https://api.covalenthq.com/v1/eth-mainnet/tokens/${tokenCA}/token_holders_v2/?date=${date}`;

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
