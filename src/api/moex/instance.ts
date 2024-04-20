import axios from "axios";

export const moexInstance = axios.create({
  baseURL: 'https://iss.moex.com/iss/'
});