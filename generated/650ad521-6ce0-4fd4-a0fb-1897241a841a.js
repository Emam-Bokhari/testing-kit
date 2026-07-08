import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

export const options = {
  vus: 100,
  duration: "2m",
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

const BASE_URL = "http://10.10.26.181:9001/api/v1";
const JWT_TOKEN = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNDg4NTkxOWJlNTI4YmJiNjE3ODBiZCIsImVtYWlsIjoibW9zaGZpcXVycmFobWFuMzdAZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzgzNDEzODExLCJleHAiOjE4MTQ5NDk4MTEsImlzcyI6InBob3RvbGFnYmUifQ.sdtxfrDO3FpRrHZ46O9WGSE9xnmLOnCzR5btF4rMBFCPUtdHUR3MgwN71eXveO0BqvM-J1uxL3QtXTO8o56gcQ";
const REQUESTS = [
  {
    "method": "POST",
    "label": "/api/v1/auth/register",
    "path": "/api/v1/auth/register",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_0"
  },
  {
    "method": "POST",
    "label": "/api/v1/auth/login",
    "path": "/api/v1/auth/login",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_1"
  },
  {
    "method": "POST",
    "label": "/api/v1/auth/verify-otp",
    "path": "/api/v1/auth/verify-otp",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_2"
  },
  {
    "method": "POST",
    "label": "/api/v1/auth/resend-otp",
    "path": "/api/v1/auth/resend-otp",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_3"
  },
  {
    "method": "POST",
    "label": "/api/v1/auth/forget-password",
    "path": "/api/v1/auth/forget-password",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_4"
  },
  {
    "method": "POST",
    "label": "/api/v1/auth/reset-password",
    "path": "/api/v1/auth/reset-password",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_5"
  },
  {
    "method": "POST",
    "label": "/api/v1/auth/change-password",
    "path": "/api/v1/auth/change-password",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_6"
  },
  {
    "method": "POST",
    "label": "/api/v1/auth/refresh-token",
    "path": "/api/v1/auth/refresh-token",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_7"
  },
  {
    "method": "GET",
    "label": "/api/v1/supports",
    "path": "/api/v1/supports",
    "body": null,
    "metricName": "route_8"
  },
  {
    "method": "POST",
    "label": "/api/v1/supports",
    "path": "/api/v1/supports",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_9"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/supports/status/:supportId",
    "path": "/api/v1/supports/status/1",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_10"
  },
  {
    "method": "DELETE",
    "label": "/api/v1/supports/:supportId",
    "path": "/api/v1/supports/1",
    "body": null,
    "metricName": "route_11"
  },
  {
    "method": "GET",
    "label": "/api/v1/supports/:supportId",
    "path": "/api/v1/supports/1",
    "body": null,
    "metricName": "route_12"
  },
  {
    "method": "POST",
    "label": "/api/v1/content-pages",
    "path": "/api/v1/content-pages",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_13"
  },
  {
    "method": "DELETE",
    "label": "/api/v1/content-pages/:type",
    "path": "/api/v1/content-pages/1",
    "body": null,
    "metricName": "route_14"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/content-pages/:type",
    "path": "/api/v1/content-pages/1",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_15"
  },
  {
    "method": "GET",
    "label": "/api/v1/content-pages/:type",
    "path": "/api/v1/content-pages/1",
    "body": null,
    "metricName": "route_16"
  },
  {
    "method": "GET",
    "label": "/api/v1/faqs",
    "path": "/api/v1/faqs",
    "body": null,
    "metricName": "route_17"
  },
  {
    "method": "POST",
    "label": "/api/v1/faqs",
    "path": "/api/v1/faqs",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_18"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/faqs/restore-all",
    "path": "/api/v1/faqs/restore-all",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_19"
  },
  {
    "method": "DELETE",
    "label": "/api/v1/faqs/:faqId",
    "path": "/api/v1/faqs/1",
    "body": null,
    "metricName": "route_20"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/faqs/:faqId",
    "path": "/api/v1/faqs/1",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_21"
  },
  {
    "method": "GET",
    "label": "/api/v1/blogs",
    "path": "/api/v1/blogs",
    "body": null,
    "metricName": "route_22"
  },
  {
    "method": "POST",
    "label": "/api/v1/blogs",
    "path": "/api/v1/blogs",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_23"
  },
  {
    "method": "GET",
    "label": "/api/v1/blogs/featured",
    "path": "/api/v1/blogs/featured",
    "body": null,
    "metricName": "route_24"
  },
  {
    "method": "DELETE",
    "label": "/api/v1/blogs/:blogId",
    "path": "/api/v1/blogs/1",
    "body": null,
    "metricName": "route_25"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/blogs/:blogId",
    "path": "/api/v1/blogs/1",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_26"
  },
  {
    "method": "GET",
    "label": "/api/v1/blogs/:blogId",
    "path": "/api/v1/blogs/1",
    "body": null,
    "metricName": "route_27"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/blogs/:blogId/featured",
    "path": "/api/v1/blogs/1/featured",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_28"
  },
  {
    "method": "GET",
    "label": "/api/v1/admins",
    "path": "/api/v1/admins",
    "body": null,
    "metricName": "route_29"
  },
  {
    "method": "POST",
    "label": "/api/v1/admins",
    "path": "/api/v1/admins",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_30"
  },
  {
    "method": "DELETE",
    "label": "/api/v1/admins/:adminId",
    "path": "/api/v1/admins/1",
    "body": null,
    "metricName": "route_31"
  },
  {
    "method": "GET",
    "label": "/api/v1/users",
    "path": "/api/v1/users",
    "body": null,
    "metricName": "route_32"
  },
  {
    "method": "DELETE",
    "label": "/api/v1/users/:userId",
    "path": "/api/v1/users/1",
    "body": null,
    "metricName": "route_33"
  },
  {
    "method": "GET",
    "label": "/api/v1/users/:userId",
    "path": "/api/v1/users/1",
    "body": null,
    "metricName": "route_34"
  },
  {
    "method": "DELETE",
    "label": "/api/v1/users/me/profile",
    "path": "/api/v1/users/me/profile",
    "body": null,
    "metricName": "route_35"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/users/me/profile",
    "path": "/api/v1/users/me/profile",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_36"
  },
  {
    "method": "GET",
    "label": "/api/v1/users/me/profile",
    "path": "/api/v1/users/me/profile",
    "body": null,
    "metricName": "route_37"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/users/:userId/status",
    "path": "/api/v1/users/1/status",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_38"
  },
  {
    "method": "GET",
    "label": "/api/v1/chats",
    "path": "/api/v1/chats",
    "body": null,
    "metricName": "route_39"
  },
  {
    "method": "POST",
    "label": "/api/v1/chats",
    "path": "/api/v1/chats",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_40"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/chats/:chatId/read",
    "path": "/api/v1/chats/1/read",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_41"
  },
  {
    "method": "DELETE",
    "label": "/api/v1/chats/:chatId",
    "path": "/api/v1/chats/1",
    "body": null,
    "metricName": "route_42"
  },
  {
    "method": "POST",
    "label": "/api/v1/messages",
    "path": "/api/v1/messages",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_43"
  },
  {
    "method": "GET",
    "label": "/api/v1/messages/chat/:chatId",
    "path": "/api/v1/messages/chat/1",
    "body": null,
    "metricName": "route_44"
  },
  {
    "method": "DELETE",
    "label": "/api/v1/messages/:messageId",
    "path": "/api/v1/messages/1",
    "body": null,
    "metricName": "route_45"
  },
  {
    "method": "POST",
    "label": "/api/v1/fcm-tokens",
    "path": "/api/v1/fcm-tokens",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_46"
  },
  {
    "method": "GET",
    "label": "/api/v1/photos",
    "path": "/api/v1/photos",
    "body": null,
    "metricName": "route_47"
  },
  {
    "method": "POST",
    "label": "/api/v1/photos",
    "path": "/api/v1/photos",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_48"
  },
  {
    "method": "POST",
    "label": "/api/v1/photos/:photoId/print-layout",
    "path": "/api/v1/photos/1/print-layout",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_49"
  },
  {
    "method": "POST",
    "label": "/api/v1/photos/:photoId/convert",
    "path": "/api/v1/photos/1/convert",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_50"
  },
  {
    "method": "POST",
    "label": "/api/v1/photos/:photoId/pdf",
    "path": "/api/v1/photos/1/pdf",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_51"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/photos/:photoId/regenerate",
    "path": "/api/v1/photos/1/regenerate",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_52"
  },
  {
    "method": "GET",
    "label": "/api/v1/upscales",
    "path": "/api/v1/upscales",
    "body": null,
    "metricName": "route_53"
  },
  {
    "method": "POST",
    "label": "/api/v1/upscales",
    "path": "/api/v1/upscales",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_54"
  },
  {
    "method": "POST",
    "label": "/api/v1/payments/uddoktapay/initiate",
    "path": "/api/v1/payments/uddoktapay/initiate",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_55"
  },
  {
    "method": "GET",
    "label": "/api/v1/payments/uddoktapay/redirect",
    "path": "/api/v1/payments/uddoktapay/redirect",
    "body": null,
    "metricName": "route_56"
  },
  {
    "method": "POST",
    "label": "/api/v1/payments/uddoktapay/redirect",
    "path": "/api/v1/payments/uddoktapay/redirect",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_57"
  },
  {
    "method": "POST",
    "label": "/api/v1/payments/uddoktapay/webhook",
    "path": "/api/v1/payments/uddoktapay/webhook",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_58"
  },
  {
    "method": "GET",
    "label": "/api/v1/payments/:paymentId",
    "path": "/api/v1/payments/1",
    "body": null,
    "metricName": "route_59"
  },
  {
    "method": "GET",
    "label": "/api/v1/wallets/me",
    "path": "/api/v1/wallets/me",
    "body": null,
    "metricName": "route_60"
  },
  {
    "method": "GET",
    "label": "/api/v1/wallets/me/history",
    "path": "/api/v1/wallets/me/history",
    "body": null,
    "metricName": "route_61"
  },
  {
    "method": "GET",
    "label": "/api/v1/credit-settings",
    "path": "/api/v1/credit-settings",
    "body": null,
    "metricName": "route_62"
  },
  {
    "method": "PATCH",
    "label": "/api/v1/credit-settings/:key",
    "path": "/api/v1/credit-settings/1",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_63"
  },
  {
    "method": "POST",
    "label": "/api/v1/reduce",
    "path": "/api/v1/reduce",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_64"
  },
  {
    "method": "GET",
    "label": "/api/v1/reduce",
    "path": "/api/v1/reduce",
    "body": null,
    "metricName": "route_65"
  },
  {
    "method": "GET",
    "label": "/api/v1/resize",
    "path": "/api/v1/resize",
    "body": null,
    "metricName": "route_66"
  },
  {
    "method": "POST",
    "label": "/api/v1/resize",
    "path": "/api/v1/resize",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_67"
  },
  {
    "method": "POST",
    "label": "/api/v1/bg-remove",
    "path": "/api/v1/bg-remove",
    "body": {
      "name": "test",
      "value": 1,
      "active": true
    },
    "metricName": "route_68"
  },
  {
    "method": "GET",
    "label": "/api/v1/bg-remove",
    "path": "/api/v1/bg-remove",
    "body": null,
    "metricName": "route_69"
  },
  {
    "method": "GET",
    "label": "/api/v1/bg-remove/:jobId",
    "path": "/api/v1/bg-remove/1",
    "body": null,
    "metricName": "route_70"
  },
  {
    "method": "GET",
    "label": "/",
    "path": "/",
    "body": null,
    "metricName": "route_71"
  }
];

const ROUTE_TRENDS = {};
REQUESTS.forEach((req) => {
  ROUTE_TRENDS[req.metricName] = new Trend(req.metricName);
});

export default function () {
  for (const req of REQUESTS) {
    const url = BASE_URL + req.path;
    const params = {
      headers: {
        'Content-Type': 'application/json',
        ...(JWT_TOKEN ? { Authorization: 'Bearer ' + JWT_TOKEN } : {}),
      },
      tags: { name: req.method + ' ' + req.label },
    };

    const body = req.body ? JSON.stringify(req.body) : null;
    let res;

    if (req.method === 'GET') {
      res = http.get(url, params);
    } else if (req.method === 'POST') {
      res = http.post(url, body, params);
    } else if (req.method === 'PUT') {
      res = http.put(url, body, params);
    } else if (req.method === 'PATCH') {
      res = http.patch(url, body, params);
    } else if (req.method === 'DELETE') {
      res = http.del(url, null, params);
    }

    if (res) {
      ROUTE_TRENDS[req.metricName].add(res.timings.duration);

      check(res, {
        'got a response (no connection error)': (r) => r.status !== 0,
        'status is not 5xx': (r) => r.status > 0 && r.status < 500,
      });
    }
  }

  sleep(1);
}
