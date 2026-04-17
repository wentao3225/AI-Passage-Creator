// @ts-ignore
/* eslint-disable */
import request from "@/request";
/** 此处后端没有提供注释 POST /user/add */
export async function addUser(body, options) {
    return request("/user/add", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        data: body,
        ...(options || {}),
    });
}
/** 此处后端没有提供注释 POST /user/delete */
export async function deleteUser(body, options) {
    return request("/user/delete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        data: body,
        ...(options || {}),
    });
}
/** 此处后端没有提供注释 GET /user/get/login */
export async function getLoginUser(options) {
    return request("/user/get/login", {
        method: "GET",
        ...(options || {}),
    });
}
/** 此处后端没有提供注释 POST /user/list/page */
export async function listUserByPage(body, options) {
    return request("/user/list/page", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        data: body,
        ...(options || {}),
    });
}
/** 此处后端没有提供注释 POST /user/login */
export async function userLogin(body, options) {
    return request("/user/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        data: body,
        ...(options || {}),
    });
}
/** 此处后端没有提供注释 POST /user/logout */
export async function userLogout(options) {
    return request("/user/logout", {
        method: "POST",
        ...(options || {}),
    });
}
/** 此处后端没有提供注释 POST /user/register */
export async function userRegister(body, options) {
    return request("/user/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        data: body,
        ...(options || {}),
    });
}
/** 此处后端没有提供注释 POST /user/update */
export async function updateUser(body, options) {
    return request("/user/update", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        data: body,
        ...(options || {}),
    });
}
