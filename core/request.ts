/**
 * Front-end fetch syste,
 */

const baseApi = "https://api.memeturbo.fun/"
const request_router = {
    search:"lts",
    spot:{
        pump:"spot/pump",
        jup:"spot/jup"
    },
    leverage:{
        pump:"leverage/pump",
        jup:"leverage/jup"
    },
    clone:{
        info:"info",
        clone:"clone",
        batch_clone:"batch-clone",
        create:"create",
        batch_create:"batch-create"
    }
};

async function requester(url: string, requestOptions: any) {
  try {
    return (await fetch(url, requestOptions)).json();
  } catch (e) {
    console.log("🐞 req error", e);
  }

  return false;
}

function request_method_get(headers: any) {
  var requestOptions = {
    method: "GET",
    headers: headers,
    redirect: "follow",
  };

  return requestOptions;
}

function request_method_post(bodys: any, headers: any) {
  var requestOptions = {
    method: "POST",
    headers: headers,
    body: bodys,
    redirect: "follow",
  };

  return requestOptions;
}

function request_get_unauth() {
  return request_method_get({});
}

function request_post_unauth(data: any) {
  var h = new Headers();

  h.append("Content-Type", "application/json");

  return request_method_post(JSON.stringify(data), h);
}

async function api_search(seed?: string) {
  try {
    let path = baseApi+request_router.search;
    if(seed)
    {
        path+=`?search=${seed}`
    }
    return await requester(
      path,
      request_get_unauth(),
    );
  } catch (e) {
    console.error(e);

    return [];
  }
}

async function api_pump_spot(mint:string,address:string,amount:string) {
  try {
    return await requester(
      `${baseApi+request_router.spot.pump}`,
      request_post_unauth(
        {
            mint,
            address,
            amount
        }
      ),
    );
  } catch (e) {
    console.error(e);

    return 0;
  }
}
async function api_jup_spot(mint:string,address:string,amount:string) {
  try {
    return await requester(
      `${baseApi+request_router.spot.jup}`,
      request_post_unauth(
        {
            mint,
            address,
            amount
        }
      ),
    );
  } catch (e) {
    console.error(e);

    return 0;
  }
}

async function api_leverage_pump(mint:string,address:string,amount:string) {
  try {
    return await requester(
      `${baseApi+request_router.leverage.pump}`,
      request_post_unauth(
        {
            mint,
            address,
            amount
        }
      ),
    );
  } catch (e) {
    console.error(e);

    return 0;
  }
}

async function api_leverage_jup(mint:string,address:string,amount:string) {
  try {
    return await requester(
      `${baseApi+request_router.leverage.jup}`,
      request_post_unauth(
        {
            mint,
            address,
            amount
        }
      ),
    );
  } catch (e) {
    console.error(e);

    return 0;
  }
}

async function api_info(seed: string) {
  try {
    let path = baseApi+request_router.clone.info;
    path+=`/${seed}`
    return await requester(
      path,
      request_get_unauth(),
    );
  } catch (e) {
    console.error(e);

    return [];
  }
}

async function api_clone(user:string,address:string) {
  try {
    let path = baseApi+request_router.clone.clone;
    path+=`/${address}`
    return await requester(
      path,
      request_post_unauth(
        {
            user
        }
      ),
    );
  } catch (e) {
    console.error(e);

    return 0;
  }
}

async function api_clone_batch(user:string,address:string,amount:number) {
  try {
    let path = baseApi+request_router.clone.batch_clone;
    path+=`/${address}`
    return await requester(
      path,
      request_post_unauth(
        {
            user,
            amount
        }
      ),
    );
  } catch (e) {
    console.error(e);

    return 0;
  }
}

async function api_create(user:string,metadata:any) {
  try {
    let path = baseApi+request_router.clone.create;
    return await requester(
      path,
      request_post_unauth(
        {
            user,
            metadata
        }
      ),
    );
  } catch (e) {
    console.error(e);

    return 0;
  }
}

async function api_create_batch(user:string,metadata:any,amount:number) {
  try {
    let path = baseApi+request_router.clone.batch_create;
    return await requester(
      path,
      request_post_unauth(
        {
            user,
            metadata,
            amount
        }
      ),
    );
  } catch (e) {
    console.error(e);

    return 0;
  }
}


async function api_metadata(url: string) {
  try {
    return await requester(
      url,
      request_get_unauth(),
    );
  } catch (e) {
    console.error(e);

    return [];
  }
}
export {
    api_search,
    api_pump_spot,
    api_jup_spot,
    api_leverage_pump,
    api_leverage_jup,
    api_info,
    api_clone,
    api_metadata,
    api_create,
    api_clone_batch,
    api_create_batch
};