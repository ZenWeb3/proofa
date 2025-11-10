// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract IPRegistry is Ownable {
    // Simple counter instead of Counters library
    uint256 private _assetIdCounter;

    // Blueprint for each creative asset
    struct IPAsset {
        uint256 id; // Unique ID
        string ipfsHash; // Link to the file on IPFS
        address owner; // Who created it
        string assetType; // Type: image, audio, text
        uint256 timestamp; // When it was registered
    }

    // Store assets by ID
    mapping(uint256 => IPAsset) private assets;

    // Store asset IDs by owner
    mapping(address => uint256[]) private ownerToAssets;

    // Event for off-chain listeners (like your Telegram bot)
    event AssetRegistered(
        uint256 indexed id,
        address indexed owner,
        string ipfsHash,
        string assetType,
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {}

    // Register a new asset
    function registerAsset(
        string memory _ipfsHash,
        string memory _assetType
    ) public returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");

        // Restrict asset types
        require(
            keccak256(bytes(_assetType)) == keccak256(bytes("image")) ||
                keccak256(bytes(_assetType)) == keccak256(bytes("audio")) ||
                keccak256(bytes(_assetType)) == keccak256(bytes("video")) ||
                keccak256(bytes(_assetType)) == keccak256(bytes("text")) ||
                keccak256(bytes(_assetType)) == keccak256(bytes("document")),
            "Invalid asset type"
        );

        // Increment counter and get new asset ID
        _assetIdCounter++;
        uint256 newId = _assetIdCounter;

        // Create the asset and store it by ID
        assets[newId] = IPAsset({
            id: newId,
            ipfsHash: _ipfsHash,
            owner: msg.sender,
            assetType: _assetType,
            timestamp: block.timestamp
        });

        // Add the asset ID to the owner's list
        ownerToAssets[msg.sender].push(newId);

        // Trigger the event for off-chain listeners
        emit AssetRegistered(
            newId,
            msg.sender,
            _ipfsHash,
            _assetType,
            block.timestamp
        );

        return newId;
    }

    // Get an asset by ID
    function getAsset(uint256 _id) public view returns (IPAsset memory) {
        require(_id > 0 && _id <= _assetIdCounter, "Asset not found");
        return assets[_id];
    }

    // Get all asset IDs owned by a user
    function getAssetsByOwner(
        address _owner
    ) public view returns (uint256[] memory) {
        return ownerToAssets[_owner];
    }

    // Get the total number of assets
    function totalAssets() public view returns (uint256) {
        return _assetIdCounter;
    }
}
