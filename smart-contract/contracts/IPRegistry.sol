// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract IPRegistry is Ownable {
    uint256 private _assetIdCounter;

    struct IPAsset {
        uint256 id;
        string ipfsHash;
        address owner;
        string assetType;
        uint256 timestamp;
    }

    mapping(uint256 => IPAsset) private assets;
    mapping(address => uint256[]) private ownerToAssets;

    event AssetRegistered(
        uint256 indexed id,
        address indexed owner,
        string ipfsHash,
        string assetType,
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {}

    function registerAsset(
        string memory _ipfsHash,
        string memory _assetType
    ) public returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");

        require(
            keccak256(bytes(_assetType)) == keccak256(bytes("image")) ||
                keccak256(bytes(_assetType)) == keccak256(bytes("audio")) ||
                keccak256(bytes(_assetType)) == keccak256(bytes("video")) ||
                keccak256(bytes(_assetType)) == keccak256(bytes("text")) ||
                keccak256(bytes(_assetType)) == keccak256(bytes("document")),
            "Invalid asset type"
        );

        _assetIdCounter++;
        uint256 newId = _assetIdCounter;

        assets[newId] = IPAsset({
            id: newId,
            ipfsHash: _ipfsHash,
            owner: msg.sender,
            assetType: _assetType,
            timestamp: block.timestamp
        });

        ownerToAssets[msg.sender].push(newId);

        emit AssetRegistered(
            newId,
            msg.sender,
            _ipfsHash,
            _assetType,
            block.timestamp
        );

        return newId;
    }

    function getAsset(uint256 _id) public view returns (IPAsset memory) {
        require(_id > 0 && _id <= _assetIdCounter, "Asset not found");
        return assets[_id];
    }

    function getAssetsByOwner(
        address _owner
    ) public view returns (uint256[] memory) {
        return ownerToAssets[_owner];
    }

    function totalAssets() public view returns (uint256) {
        return _assetIdCounter;
    }

    // ✅ New: Get full certificate for an asset
    function getCertificate(
        uint256 _id
    )
        public
        view
        returns (
            uint256 id,
            address owner,
            string memory ipfsHash,
            string memory assetType,
            uint256 timestamp,
            string memory onChainLink
        )
    {
        IPAsset memory asset = getAsset(_id);
        id = asset.id;
        owner = asset.owner;
        ipfsHash = asset.ipfsHash;
        assetType = asset.assetType;
        timestamp = asset.timestamp;

        // Construct a link to the asset on-chain (optional formatting)
        onChainLink = string(
            abi.encodePacked(
                "https://etherscan.io/address/",
                _addressToString(address(this)),
                "#readContract"
            )
        );
    }

    // Helper function to convert address to string
    function _addressToString(
        address _addr
    ) internal pure returns (string memory) {
        bytes20 value = bytes20(uint160(_addr));
        bytes16 hexSymbols = "0123456789abcdef";
        bytes memory str = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            str[i * 2] = hexSymbols[uint8(value[i] >> 4)];
            str[i * 2 + 1] = hexSymbols[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }
}
