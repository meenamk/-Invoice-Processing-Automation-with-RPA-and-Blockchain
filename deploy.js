const { ethers } = require("hardhat"); // Import ethers from Hardhat
async function main() {
    const contractCode = await ethers.getContractFactory("InvoiceProcessing");
    const ethAmount = ethers.parseEther("0.02857");
    const contractDeployed = await contractCode.deploy({ value: ethAmount});
    //await contractDeployed.deployed();

    console.log(`Deployed contract address ${contractDeployed.target}`);
}

main().then(()=>process.exit(0)).catch((error)=>{
    console.error(error);
    process.exit(1);
})