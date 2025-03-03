// api/src/utils/response.js
export function responseSuccess(data, message, headers = {}) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      message,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }
  );
}

export function responseError(error, message, status = 500, headers = {}) {
  return new Response(
    JSON.stringify({
      success: false,
      error,
      message,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }
  );
}

export function responseFailed(data, message, status = 400, headers = {}) {
  return new Response(
    JSON.stringify({
      success: false,
      data,
      message,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }
  );
}
