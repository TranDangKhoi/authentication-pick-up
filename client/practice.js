class Http {
  constructor() {
    this.instance = axios.create({
      baseURL: "http://localhost:4000",
      timeout: 10000,
    });
    this.refreshTokenRequest = null;
    this.instance.interceptors.request.use(
      (config) => {
        console.log(config);
        const access_token = localStorage.getItem("access_token");
        if (access_token) {
          config.headers.Authorization = `Bearer ${access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    this.instance.interceptors.response.use(
      (config) => config,
      (error) => {
        if (
          error.response?.status === 401 &&
          error.response.data.name === "EXPIRED_ACCESS_TOKEN"
        ) {
          this.refreshTokenRequest = this.refreshTokenRequest
            ? this.refreshTokenRequest
            : refreshToken().finally(() => {
                this.refreshTokenRequest = null;
              });
          return this.refreshTokenRequest
            .then((access_token) => {
              error.response.config.headers.Authorization = `Bearer ${access_token}`;
              return this.instance(error.response.config);
            })
            .catch((err) => {
              throw err;
            });
        }
        Promise.reject(error);
      }
    );
  }

  get(url) {
    return this.instance.get(url);
  }

  post(url, body) {
    return this.instance.post(url, body);
  }
}
const http = new Http();

const form = document.querySelector("#login-form");
const getProfileBtn = document.querySelector("#btn-get-profile");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.querySelector("#username").value;
  const password = document.querySelector("#password").value;
  http
    .post("/login", {
      username,
      password,
    })
    .then((res) => {
      console.log(res);
      localStorage.setItem("access_token", res.data.data.access_token);
      localStorage.setItem("refresh_token", res.data.data.refresh_token);
    })
    .catch((error) => {
      console.log(error);
    });
});

getProfileBtn.addEventListener("click", (e) => {
  e.preventDefault();
  fetchProfile();
});

function fetchProfile() {
  http
    .get("/profile")
    .then((res) => console.log(res))
    .catch((err) => {
      console.log(err);
    });
}

async function refreshToken() {
  const refresh_token = localStorage.getItem("refresh_token");
  try {
    const res = await http.post("/refresh-token", {
      refresh_token,
    });
    const { access_token } = res.data.data;
    localStorage.setItem("access_token", access_token);
    return access_token;
  } catch (err) {
    console.log(err);
  }
}
