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

    struct License {
        uint256 price;
        bool isCommercial;
        uint256 royaltyPercent;
    }

    mapping(uint256 => IPAsset) public assets;
    mapping(address => uint256[]) private ownerToAssets;
    mapping(uint256 => License) public assetLicenses;
    mapping(bytes32 => uint256) private hashToAssetId;

    event AssetRegistered(
        uint256 indexed id,
        address indexed owner,
        string ipfsHash,
        string assetType,
        uint256 timestamp
    );

    event AssetTransferred(
        uint256 indexed assetId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    event LicenseSet(
        uint256 indexed assetId,
        uint256 price,
        bool isCommercial,
        uint256 royaltyPercent
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

        bytes32 hashKey = keccak256(bytes(_ipfsHash));
        require(hashToAssetId[hashKey] == 0, "Asset already registered");

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
        hashToAssetId[hashKey] = newId;

        emit AssetRegistered(
            newId,
            msg.sender,
            _ipfsHash,
            _assetType,
            block.timestamp
        );

        return newId;
    }

    function setLicense(
        uint256 _assetId,
        uint256 _price,
        bool _isCommercial,
        uint256 _royaltyPercent
    ) public {
        require(_assetId > 0 && _assetId <= _assetIdCounter, "Asset not found");
        require(assets[_assetId].owner == msg.sender, "Not the owner");
        require(_royaltyPercent <= 100, "Royalty must be 0-100");

        assetLicenses[_assetId] = License({
            price: _price,
            isCommercial: _isCommercial,
            royaltyPercent: _royaltyPercent
        });

        emit LicenseSet(_assetId, _price, _isCommercial, _royaltyPercent);
    }

    function getLicense(
        uint256 _assetId
    )
        public
        view
        returns (uint256 price, bool isCommercial, uint256 royaltyPercent)
    {
        License memory license = assetLicenses[_assetId];
        return (license.price, license.isCommercial, license.royaltyPercent);
    }

    function transferAsset(uint256 _assetId, address _newOwner) public {
        require(_assetId > 0 && _assetId <= _assetIdCounter, "Asset not found");
        require(assets[_assetId].owner == msg.sender, "Not the owner");
        require(_newOwner != address(0), "Invalid address");
        require(_newOwner != msg.sender, "Cannot transfer to yourself");

        address oldOwner = msg.sender;

        _removeAssetFromOwner(oldOwner, _assetId);
        ownerToAssets[_newOwner].push(_assetId);
        assets[_assetId].owner = _newOwner;

        emit AssetTransferred(_assetId, oldOwner, _newOwner, block.timestamp);
    }

    function verifyAsset(
        string memory _ipfsHash
    )
        public
        view
        returns (
            bool exists,
            uint256 assetId,
            address owner,
            uint256 timestamp,
            string memory assetType
        )
    {
        bytes32 hashKey = keccak256(bytes(_ipfsHash));
        uint256 id = hashToAssetId[hashKey];

        if (id == 0) {
            return (false, 0, address(0), 0, "");
        }

        IPAsset memory asset = assets[id];
        return (true, asset.id, asset.owner, asset.timestamp, asset.assetType);
    }

    // ✅ New getter for hashToAssetId (use this in tests)
    function getAssetIdByHash(bytes32 _hash) public view returns (uint256) {
        return hashToAssetId[_hash];
    }

    function _removeAssetFromOwner(address _owner, uint256 _assetId) private {
        uint256[] storage assetIds = ownerToAssets[_owner];
        for (uint256 i = 0; i < assetIds.length; i++) {
            if (assetIds[i] == _assetId) {
                assetIds[i] = assetIds[assetIds.length - 1];
                assetIds.pop();
                break;
            }
        }
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

        onChainLink = string(
            abi.encodePacked(
                "https://etherscan.io/address/",
                _addressToString(address(this)),
                "#readContract"
            )
        );
    }

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
