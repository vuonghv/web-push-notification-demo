# Web Push Notifications demo

## Requirements

* Firefox 44+
* Chrome 40+
* Opera 24+

## Running demo

1. Install dependences:

    ```
    npm install
    ```

2. Build javascript (Please ignore output errors, for now):

    ```
    tsc
    ```

3. Run the server:

    ```
    npm start
    ```

4. Open the app at https://127.0.0.1:7000/index.html (Note: You will need to add a security exception)

 **Chrome note: You have to run Chrome with the option "--ignore-certificate-errors",
 because the backend server uses a self-signed certificate**

 ```bash
 $ google-chrome --ignore-certificate-errors
 ```

## Thanks
Thanks [Chris Mills](https://github.com/chrisdavidmills) for an excellent [push-api-demo](https://github.com/chrisdavidmills/push-api-demo).
