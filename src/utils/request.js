import axios from "axios";
import { BASE_URI } from "./pathMap";


// 聲明一個實例，用後端服務器的基鏈接訪問，縮短代碼量
const instance = axios.create({
    baseURL : BASE_URI,
})

// 添加请求拦截器
instance.interceptors.request.use(function (config) {
    console.log("添加请求拦截器");
    // 在发送请求之前做些什么
    return config;
}, function (error) {
    // 对请求错误做些什么
    return Promise.reject(error);
});

// 添加响应拦截器
instance.interceptors.response.use(function (response) {
    console.log("添加响应拦截器");
    // 对响应数据做点什么
    return response;
}, function (error) {
    // 对响应错误做点什么
    return Promise.reject(error);
});


export default {
    get: instance.get,
    post: instance.post
}
