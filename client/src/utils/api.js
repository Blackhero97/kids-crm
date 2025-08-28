import axios from "axios";

const API_URL = "/api/children";

export const getChildren = () => axios.get(API_URL);
export const addChild = (data) => axios.post(API_URL, data);
export const checkoutChild = (id) => axios.put(`${API_URL}/${id}/checkout`);
