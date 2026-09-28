require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
  solidity: {
    version: '0.8.0',
    settings: {
      optimizer: {
        enabled: false,
        runs: 200
      }
    }
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  networks: {
    hardhat: {
      chainId: 1337
    }
  }
};
