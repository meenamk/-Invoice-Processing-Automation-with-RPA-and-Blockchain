require("dotenv").config();
const INFURA_API_KEY = process.env.INFURA_URL //need to add infura link
const SIGNER_PRIVATE_KEY=process.env.PRIVATE_KEY; // need to add private key
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { ethers } = require("ethers");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

//app.use(bodyParser.json());--deprecated
const port = 8000;

const contractAddress = "0x7fF15A634D7A2b7E4bce0aeCa6588C4000E51184";
const contractABI = JSON.parse(fs.readFileSync("./artifacts/contracts/InvoiceProcessing.sol/InvoiceProcessing.json", 'utf-8'));

const provider = new ethers.getDefaultProvider(INFURA_API_KEY);
const signer = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider);

const invoiceProcessContract = new ethers.Contract(contractAddress, contractABI.abi, signer);

app.get("/", function(req, res){
    res.send("Hello welcome to Node js app");
});

//getMethods

app.get("/getcontractbalance", async function(req, res){
    const contractBalance= await invoiceProcessContract.getContractBalance()
    res.send("The available balance of the contract is "+contractBalance);
});

app.get("/isauthorizedsubmitter", async function(req, res){
    const submitterAddress = req.body.address;

    if(!submitterAddress){
        res.status(406).send({"status":"failed",'Reason': "No submitter address provided"});
    }else{
        console.log("Received Address:", submitterAddress);
        const isauthorizedSubmitter = await invoiceProcessContract.isAuthorizedSubmitter(submitterAddress);
        if (isauthorizedSubmitter){
            res.status(200).send(`The given address ${submitterAddress} is authorized`)
        }else{
            res.status(200).send(`The given address ${submitterAddress} is not authorized`) 
        }
    }
    
});

//postmethods
app.post("/addauthorizedsubmitter", async function(req, res) {
    try{
        const submitterAddress = req.body.address;
        if(!submitterAddress){
            res.status(406).send({"status":"failed",'Reason': "No submitter address provided"});
        }
        else{
            console.log("Received Address:", submitterAddress);
            const tx = await invoiceProcessContract.addAuthorizedSubmitter(submitterAddress);
            waitForSeconds(10);
            console.log(tx)
            console.log(tx.hash);
            provider.getTransactionReceipt(tx.hash).then((receipt) => {
            if (receipt === null) {
                console.log("Transaction is not mined yet");
            } else if (receipt.status === 0) {
                console.log("Transaction failed");
            } else {
                console.log("Transaction successful");
            }}).catch((error) => {
                console.error("Error occurred:", error);});
            
            invoiceProcessContract.on("SubmitterAdded",(addressSub,isAdded)=>{
                if (isAdded){
                    res.status(200).send({"status":"completed","Message":`The ${addressSub} added`});
                }else{
                    res.status(200).send({"status":"completed","Message":`The ${addressSub} not added`});
                }

            });
        }
    }catch(error) {
    console.error(error);
    }
});


app.post("/payinvoice", function(req, res) {
    console.log("Received req:", req.body);
    res.send(req.body.name);
});

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.post("/addinvoice", async function(req,res){
    try{
    //console.log("Received req:",req.body)
    const invoiceData = req.body;
    console.log(invoiceData)
    if(!invoiceData || Object.keys(invoiceData).length === 0){
        res.status(406).send({"status":"failed",'Reason': "No invoice data provided"});
    }
    else{
        const invoiceId = parseInt(invoiceData.InvoiceID);
        const vendorName = invoiceData.VendorName;
        const vendor = invoiceData.VendorAddress;
        const vendorid = parseInt(invoiceData.VendorID);
        const subtotal = invoiceData.Subtotal;
        const tax = invoiceData.Tax;
        const total = invoiceData.Total;
        console.log(invoiceId,vendorName,vendor,vendorid,subtotal,tax,total);
        if (!invoiceId || !vendorName || !vendor || !vendorid || !subtotal || !tax || !total) {
            return res.status(400).send({ status: "failed", reason: "Missing required fields" });
        }

        const scaledSubtotal=ethers.parseUnits(subtotal.toString().replace("$",""), "ether");
        const scaledTax=ethers.parseUnits(tax.toString().replace("$",""), "ether");
        const scaledTotal=ethers.parseUnits(total.toString().replace("$",""), "ether");
        const tx= await invoiceProcessContract.addInvoice(invoiceId, vendorName, vendor, vendorid, scaledSubtotal, scaledTax, scaledTotal);
        //waitForSeconds(10);
        await delay(10000);
        console.log("Transaction sent! Waiting for confirmation...");

        // Wait for the transaction to be mined
        const receipt=await tx.wait();
        console.log(tx)
        console.log(tx.hash);
        console.log(receipt.hash);
        if (receipt === null) {
            console.log("Transaction is not mined yet");
        } else if (receipt.status === 0) {
            console.log("Transaction failed");
        } else {
            console.log("Transaction successful");
            res.status(200).send({"message":`The created transaction hash ${receipt.hash}`});
        }
    }
}catch(error) {
    console.error(error);}
});
/*
        invoiceProcessContract.on("InvoiceAdded",(invoiceId, vendor, total)=>{
                res.status(200).send({"status":"completed","Message":{"Invoice ID":`${invoiceId}`,
                "vendor":`${vendor}`,"amount":`${total}`}
            });
        });*/

app.get("/getLog", function (req,res){
    res.status(200).send({"message": "The created transaction hash 0x2b8e40a9572f6dfa126cd5d2708309465e30f317e451456a2738923004551819"});
})


app.get("/invoicelog",async function name(req,res) {
    const events = await invoiceProcessContract.queryFilter("InvoiceAdded", 
        invoiceId, receipt.vendoradd, total,);

    if (events.length > 0) {
        const event = events[0]; // Get the first event
        res.status(200).send({
        status: "completed",
        Message: {
        "Invoice ID": event.args.invoiceId.toString(),
        "vendor": event.args.vendor,
        "amount": ethers.formatUnits(event.args.total, "ether")}});
    } else {
        res.status(500).send({ status: "failed", Reason: "Event not found in logs" });
    }}
);

app.listen(port, ()=>{
    console.log(`server has been started ${port}`);
});