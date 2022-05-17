/* We require the Hardhat Runtime Environment explicitly here. This is optional
* but useful for running the script in a standalone fashion through `node <script>`.
*
* When running the script with `npx hardhat run <script>` you'll find the Hardhat
* Runtime Environment's members available in the global scope.
*/
const hre = require("hardhat");
const {exec} = require('child_process');
const fs = require('fs');

async function main() {

    /* Generate Merkle Tree*/
    let merkle

    try {
        merkle = await SyncExec(`ts-node scripts/generate-merkle-root.ts --input scripts/example.json`);
        fs.writeFileSync('scripts/merkle.json', merkle)
        merkle = JSON.parse(merkle)
    }catch (e) {
        console.error(e);
        process.exit(1);
    }

    /* CoinHelperToken */
    const CoinHelperToken = await hre.ethers.getContractFactory("CoinHelperToken");
    const CHT = await CoinHelperToken.deploy();
    await CHT.deployed();
    console.log("CoinHelperToken Created:" + CHT.address);

    try {
        let verifyCHT = await SyncExec(`npx hardhat verify --contract contracts/CoinHelperToken.sol:CoinHelperToken --network ${hre.network.name} ${CHT.address}`);
        console.log("CoinHelperToken Verified:", verifyCHT);
    } catch (e) {
        console.error(e);
    }

    /* TokenVesting */
    const TokenVesting = await hre.ethers.getContractFactory("TokenVesting");
    const TV = await TokenVesting.deploy(CHT.address);
    await TV.deployed();
    console.log("TokenVesting Created:", TV.address);

    try {
        let verifyTV = await SyncExec(`npx hardhat verify --contract contracts/TokenVesting.sol:TokenVesting --network ${hre.network.name} ${TV.address} "${CHT.address}"`);
        console.log("TokenVesting Verified:", verifyTV);
    } catch (e) {
        console.error(e);
    }

    /* MerkleDistributor */
    const MerkleDistributor = await hre.ethers.getContractFactory("MerkleDistributor");
    const MD = await MerkleDistributor.deploy(CHT.address, merkle.merkleRoot);
    await MD.deployed();
    console.log("MerkleDistributor Created:", MD.address);

    try {
        let verifyMD = await SyncExec(`npx hardhat verify --contract contracts/MerkleDistributor.sol:MerkleDistributor --network ${hre.network.name} ${MD.address} "${CHT.address}" "${merkle.merkleRoot}"`);
        console.log("MerkleDistributor Verified:", verifyMD);
    } catch (e) {
        console.error(e);
    }
}

/* exec */
function SyncExec(command) {
    return new Promise((res, rej) => {
        exec(command, (error, stdout, stderr) => {
            if (error) return rej(error.message?.concat(stderr));

            res(stdout);
        })
    })
}


/* We recommend this pattern to be able to use async/await everywhere and properly handle errors. */
main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
