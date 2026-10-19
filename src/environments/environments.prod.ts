// export const environment = {
//   production: true,
//   apiUrl: 'http://196.219.184.42/ProFlow2/api',

// };

const hostname = window.location.hostname;

export const environment = {
  production: true,

  apiUrl: `http://${hostname}/ProFlow2/api`,
};
