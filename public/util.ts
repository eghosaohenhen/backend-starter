type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type InputTag = "input" | "textarea" | "json";
type Field = InputTag | { [key: string]: Field };
type Fields = Record<string, Field>;

type operation = {
  name: string;
  endpoint: string;
  method: HttpMethod;
  fields: Fields;
};

const operations: operation[] = [
  {
    name: "Get Session User (logged in user)",
    endpoint: "/api/session",
    method: "GET",
    fields: {},
  },
  {
    name: "Create User",
    endpoint: "/api/users",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Login",
    endpoint: "/api/login",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Logout",
    endpoint: "/api/logout",
    method: "POST",
    fields: {},
  },
  {
    name: "Update User",
    endpoint: "/api/users",
    method: "PATCH",
    fields: { update: { username: "input", password: "input" } },
  },
  {
    name: "Delete User",
    endpoint: "/api/users",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Get Users (empty for all)",
    endpoint: "/api/users/:username",
    method: "GET",
    fields: { username: "input" },
  },
  //media actions
  {
    name: "Upload Media (Media Type must be 'image', 'video', or 'text') ",
    endpoint: "/api/media",
    method: "POST",
    fields: { content: "input", media_type: "input" },
  },
  //post functions

  //update the post caption (later)

  // {
  //   name: "Update Post",
  //   endpoint: "/api/posts/:id",
  //   method: "PATCH",
  //   fields: { id: "input", update: { content: "input", options: { backgroundColor: "input" } } },
  // },
  {
    name: "Delete Post",
    endpoint: "/api/posts/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Create Post(Must provide a flair. Defined flairs are (case sensitive): 'Tip', 'Artwork', 'Inspo', 'General'",
    endpoint: "/api/posts/:content_id/flair/:flair",
    method: "POST",
    fields: { content_id: "input", flair: "input" },
  },
  
  {
    name: "Get Posts (either input author, flair or id)",
    endpoint: "/api/posts",
    method: "GET",
    fields: { author: "input" , flair: "input", id:"input"},
  },
  
  //collage actions
  {
    name: "Create Collage",
    endpoint: "/api/collages",
    method: "POST",
    fields: { name: "input" },
  },
  {
    name: "Get Collage (only input one or none(to get all))",
    endpoint: "/api/collages",
    method: "GET",
    fields: { id: "input" , user_id: "input", username:"input"},
  },
  {
    name: "Delete Collage",
    endpoint: "/api/collages/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Add Content (Post) to Collage",
    endpoint: "/api/collages/:id",
    method: "POST",
    fields: { id: "input", content_id:"input" },
  },
  {
    name: "Remove Content (Post) from Collage",
    endpoint: "/api/collages/:id",
    method: "DELETE",
    fields: { id: "input", content_id:"input" },
  },
  //favorite actions
  {
    name: "Create Favorite from Post",
    endpoint: "/favorites/:post_id/collage/:collage_id",
    method: "POST",
    fields: { post_id: "input", collage_id: "input" },
  },
  {
    name: "Create Favorite (Other Item: 'user', 'space', 'collage')",
    endpoint: "/favorites/:item_id",
    method: "POST",
    fields: { item_id: "input", item_type: "input" },
  },
  {
    name: "Delete Favorite from Post",
    endpoint: "/favorites/:_id/collage/:collage_id",
    method: "POST",
    fields: { _id: "input", collage_id: "input" },
  },
  {
    name: "Delete Favorite (Other Item: 'user', 'space', 'collage')",
    endpoint: "/favorites/:_id",
    method: "POST",
    fields: { _id: "input", item_type: "input" },
  },
  {
    name: "Get Favorite (item types: 'user', 'space', 'collage', 'post')",
    endpoint: "/api/favorites/:item_id",
    method: "GET",
    fields: { item_id: "input", item_type: 'input' },
  },
  //space actions
  //comments actions 
  
];

// Do not edit below here.
// If you are interested in how this works, feel free to ask on forum!

function updateResponse(code: string, response: string) {
  document.querySelector("#status-code")!.innerHTML = code;
  document.querySelector("#response-text")!.innerHTML = response;
}

async function request(method: HttpMethod, endpoint: string, params?: unknown) {
  try {
    if (method === "GET" && params) {
      endpoint += "?" + new URLSearchParams(params as Record<string, string>).toString();
      params = undefined;
    }

    const res = fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: params ? JSON.stringify(params) : undefined,
    });

    return {
      $statusCode: (await res).status,
      $response: await (await res).json(),
    };
  } catch (e) {
    console.log(e);
    return {
      $statusCode: "???",
      $response: { error: "Something went wrong, check your console log.", details: e },
    };
  }
}

function fieldsToHtml(fields: Record<string, Field>, indent = 0, prefix = ""): string {
  return Object.entries(fields)
    .map(([name, tag]) => {
      const htmlTag = tag === "json" ? "textarea" : tag;
      return `
        <div class="field" style="margin-left: ${indent}px">
          <label>${name}:
          ${typeof tag === "string" ? `<${htmlTag} name="${prefix}${name}"></${htmlTag}>` : fieldsToHtml(tag, indent + 10, prefix + name + ".")}
          </label>
        </div>`;
    })
    .join("");
}

function getHtmlOperations() {
  return operations.map((operation) => {
    return `<li class="operation">
      <h3>${operation.name}</h3>
      <form class="operation-form">
        <input type="hidden" name="$endpoint" value="${operation.endpoint}" />
        <input type="hidden" name="$method" value="${operation.method}" />
        ${fieldsToHtml(operation.fields)}
        <button type="submit">Submit</button>
      </form>
    </li>`;
  });
}

function prefixedRecordIntoObject(record: Record<string, string>) {
  const obj: any = {}; // eslint-disable-line
  for (const [key, value] of Object.entries(record)) {
    if (!value) {
      continue;
    }
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let currentObj = obj;
    for (const key of keys) {
      if (!currentObj[key]) {
        currentObj[key] = {};
      }
      currentObj = currentObj[key];
    }
    currentObj[lastKey] = value;
  }
  return obj;
}

async function submitEventHandler(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { $method, $endpoint, ...reqData } = Object.fromEntries(new FormData(form));

  // Replace :param with the actual value.
  const endpoint = ($endpoint as string).replace(/:(\w+)/g, (_, key) => {
    const param = reqData[key] as string;
    delete reqData[key];
    return param;
  });

  const op = operations.find((op) => op.endpoint === $endpoint && op.method === $method);
  const pairs = Object.entries(reqData);
  for (const [key, val] of pairs) {
    if (val === "") {
      delete reqData[key];
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const type = key.split(".").reduce((obj, key) => obj[key], op?.fields as any);
    if (type === "json") {
      reqData[key] = JSON.parse(val as string);
    }
  }

  const data = prefixedRecordIntoObject(reqData as Record<string, string>);

  updateResponse("", "Loading...");
  const response = await request($method as HttpMethod, endpoint as string, Object.keys(data).length > 0 ? data : undefined);
  updateResponse(response.$statusCode.toString(), JSON.stringify(response.$response, null, 2));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#operations-list")!.innerHTML = getHtmlOperations().join("");
  document.querySelectorAll(".operation-form").forEach((form) => form.addEventListener("submit", submitEventHandler));
});
