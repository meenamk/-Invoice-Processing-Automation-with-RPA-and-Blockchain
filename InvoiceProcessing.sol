// SPDX-License-Identifier: MIT
// Specifies the license type, ensuring the code is open-source and reusable.
pragma solidity ^0.8.20;   // Specifies the Solidity version to use, ensuring compatibility.

contract InvoiceProcessing {
    address public owner; // Stores the owner of the contract (deployer's address).

    struct Invoice {
        string vendorName;
        address payable vendor; // 20 bytes // Address of the vendor receiving the payment
        InvoiceStatus status;   // 1 byte // Stores invoice status (Pending or Paid)
        uint256 total;        // 32 bytes // Invoice amount in wei (smallest ETH unit)
        uint256 invoiceid;    // 32 bytes // Unique invoice identifier
        uint256 vendorId;
        uint256 subtotal;
        uint256 tax;
       
    }

    struct LineItem {
        string description;
        uint256 quantity;
        uint256 unitPrice;
        uint256 amount;
    }

    //LineItem[] LineItems;

    enum InvoiceStatus { Pending, Paid }// Defines an enumeration for invoice status (either "Pending" or "Paid").

    mapping(uint256 => Invoice) private _invoices;// Maps invoice ID (uint256) to the Invoice struct. Stores all invoices.

    mapping(uint256 => bool) private _invoiceExists;// Keeps track of whether an invoice ID exists to prevent duplicates.

    mapping(address => bool) private authorizedSubmitters; // Stores addresses that are authorized (like PowerApps system) to submit invoices.


    event InvoiceAdded(uint256 indexed invoiceId, address indexed vendor, uint256 amount);// Event emitted when a new invoice is added.

    event InvoicePaid(uint256 indexed invoiceId, address indexed vendor, uint256 amount);// Event emitted when an invoice is successfully paid.

    event DebugInvoice(uint256 invoiceId, uint256 storedAmount, uint256 sentAmount);

    event LineItemAdded(string indexed description, uint256 quantity, uint256 unitPrice,uint256 amount);

    event SubmitterAdded(address indexed _submitter,bool indexed _isAuthorizedSubmitter);

    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");// Ensures that only the contract owner can execute the function.
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedSubmitters[msg.sender], "Not authorized to add invoices");// Ensures that only authorized submitters (e.g., PowerApps) can add invoices.
        _;
    }

    modifier invoiceExistsCheck(uint256 invoiceId) {
        require(_invoiceExists[invoiceId], "Invoice does not exist");// Ensures the given invoice ID exists before proceeding.
        _;
    }

    constructor() payable {
        owner = msg.sender;// Sets the deployer of the contract as the owner.
       // uint256 balance = selfbalance();
    }

    // Allows the contract to receive ETH
    //receive() external payable {}


    function getContractBalance() external view returns (uint256){
        return address(this).balance;

    }

    function isAuthorizedSubmitter(address submitter) external view returns(bool){
        return authorizedSubmitters[submitter];

    }

    function addAuthorizedSubmitter(address submitter) external onlyOwner{
        require(submitter != address(0), "Invalid authorized submitter address");
        authorizedSubmitters[submitter] = true;// Allows the contract owner to add addresses that can submit invoices.
        emit SubmitterAdded(submitter, authorizedSubmitters[submitter]);
    }

    function addInvoice(uint256 invoiceId, string memory vendorName, address payable vendor, uint256 vendorid, 
    uint256 subtotal, uint256 tax,uint256 total) 
    external onlyAuthorized {
        //LineItem[] memory LineItems
        require(!_invoiceExists[invoiceId], "Invoice already exists");// Ensures the invoice ID is unique.

        require(total != 0, "Amount must be greater than zero");// Ensures that the invoice amount is greater than zero.
 
       // invoices[invoiceId] = Invoice(invoiceId, vendor, amount, InvoiceStatus.Pending);// Creates a new invoice and stores it in the mapping.
        Invoice storage newInvoice = _invoices[invoiceId]; // Reference to storage location

        newInvoice.vendorName=vendorName;
        newInvoice.vendor = vendor;
        newInvoice.invoiceid = invoiceId;
        newInvoice.vendorId = vendorid;
        newInvoice.subtotal = subtotal;
        newInvoice.tax = tax;
        newInvoice.total = total;
        
        newInvoice.status = InvoiceStatus.Pending;

        _invoiceExists[invoiceId] = true;// Marks this invoice ID as existing.

        emit InvoiceAdded(invoiceId, vendor, total);// Emits an event to notify the blockchain that an invoice has been added.
        //addLineItem(LineItems);

    }


    // this function is to add record, but not storing on-chain
    //This is gas-efficient because no storage is used.
    /*function addLineItem(LineItem[] memory _lineItems) private {

        //emit LineItemAdded(_lineItems);
        for (uint i=0; i<_lineItems.length; i++) 
        {
          emit LineItemAdded(_lineItems[i].description, _lineItems[i].quantity, _lineItems[i].unitPrice, _lineItems[i].amount);
        }
    }*/
        

    function payInvoice(uint256 invoiceId) external payable onlyOwner invoiceExistsCheck(invoiceId) {
        Invoice storage inv = _invoices[invoiceId];// Fetches the invoice from storage.

        emit DebugInvoice(invoiceId, inv.total, msg.value); // Debug event

        require(inv.status == InvoiceStatus.Pending, "Invoice is not payable");// Ensures the invoice is in a payable state.

        require(address(this).balance > inv.total, "Contract balance insufficient"); // Ensures the exact amount is sent.

        inv.status = InvoiceStatus.Paid;// Marks the invoice as paid.

       // inv.vendor.transfer(msg.value);// Transfers the ETH amount to the vendor.
       (bool success, ) = inv.vendor.call{value: inv.total}("");
       require(success, "Payment failed");


        emit InvoicePaid(invoiceId, inv.vendor, msg.value);// Emits an event to record the successful payment.
    }
}
