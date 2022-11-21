import Web3 from 'web3';
import Web3WebSocketProvider from 'web3-providers-ws';

const options = {
    timeout: 30000, // ms

    // Useful for credentialed urls, e.g: ws://username:password@localhost:8546
    headers: {
        'access-token':
            'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJwZXJtaXNzaW9ucyI6WyIqOioiXSwiaWF0IjoxNjY4OTk3OTYyLCJleHAiOjE2NjkwMDE1NjJ9.Ga51-j-vNJVC87Laz-6GK-n8x-eJpX32gEu0fBBNrRXjhSilEG7ZL-X49hkfOZAoNUSPTfbOpRu0q8__ijKLm4wMUCGOqKU5fh4gEbHM27Tc8Cdh4kH_q5o_lZfV2CL5HEGgyYE9TuRAmyVk2SwpcRA4mEpvfHgHlJttYoq77f5EezsRRkf4Ncb-1a6BI_KmDojsqU1cUR8TnValV9y7x25EvkzqW0sKYQ_2slfMBuECOTq1u20cAeG-BjbHznaCDAqbjQ-GqmSlcskmvLN5xb8duduSUNS-p8JvjrcSgilozCGwPB4OfJbG2pj4Knsq6sKdOMRfbrMzz23QuFYaEg',
    },

    // clientConfig: {
    //     // Useful if requests are large
    //     maxReceivedFrameSize: 100000000, // bytes - default: 1MiB
    //     maxReceivedMessageSize: 100000000, // bytes - default: 8MiB

    //     // Useful to keep a connection alive
    //     keepalive: true,
    //     keepaliveInterval: 60000, // ms
    // },

    // // Enable auto reconnection
    // reconnect: {
    //     auto: true,
    //     delay: 5000, // ms
    //     maxAttempts: 5,
    //     onTimeout: false,
    // },
};

const provider = new Web3WebSocketProvider('wss://rabbit.dev', options);

const web3 = new Web3(provider);
web3.eth
    .subscribe('newBlockHeaders', () => {})
    .on('data', (blockHeader) => console.log(blockHeader.number))
    .on('error', (err) => console.log(err));
