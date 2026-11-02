// Karnataka FRUITS (Farmer Registration and Unified Beneficiary Information System) Integration
import { Farmer } from "../types";

export interface IFruitsService {
  getFarmerByFruitsId(fruitsId: string): Promise<Farmer | null>;
  searchFarmers(query: string): Promise<Farmer[]>;
}

export const MOCK_FARMERS: Farmer[] = [
  {
    id: "f-001",
    fruitsId: "1002345678",
    nameEn: "Ramesh Patil",
    nameKn: "ರಮೇಶ್ ಪಾಟೀಲ್",
    phone: "9845012345",
    village: "Sindhanur Rural",
    taluk: "Sindhanur",
    district: "Raichur",
    bankAccountMasked: "XXXX-XXXX-4589",
    ifsc: "SBIN0040123",
    landAreaAcres: 4.5,
  },
  {
    id: "f-002",
    fruitsId: "1002345679",
    nameEn: "Basavaraj Gowda",
    nameKn: "ಬಸವರಾಜ್ ಗೌಡ",
    phone: "9980123456",
    village: "Maddur Koppalu",
    taluk: "Maddur",
    district: "Mandya",
    bankAccountMasked: "XXXX-XXXX-7821",
    ifsc: "CNRB0001452",
    landAreaAcres: 6.2,
  },
  {
    id: "f-003",
    fruitsId: "1002345680",
    nameEn: "Shivanna Shetty",
    nameKn: "ಶಿವಣ್ಣ ಶೆಟ್ಟಿ",
    phone: "9448123456",
    village: "Bhadravati Agrahara",
    taluk: "Bhadravati",
    district: "Shimoga",
    bankAccountMasked: "XXXX-XXXX-1144",
    ifsc: "BARB0BHADRA",
    landAreaAcres: 3.8,
  },
  {
    id: "f-004",
    fruitsId: "1002345681",
    nameEn: "Ningappa Kumbar",
    nameKn: "ನಿಂಗಪ್ಪ ಕುಂಬಾರ",
    phone: "9731123456",
    village: "Gokak Falls Road",
    taluk: "Gokak",
    district: "Belagavi",
    bankAccountMasked: "XXXX-XXXX-8990",
    ifsc: "UBIN0532145",
    landAreaAcres: 5.0,
  },
  {
    id: "f-005",
    fruitsId: "1002345682",
    nameEn: "Mallikarjun Channabasappa",
    nameKn: "ಮಲ್ಲಿಕಾರ್ಜುನ ಚನ್ನಬಸಪ್ಪ",
    phone: "9611123456",
    village: "Harihar Grama",
    taluk: "Harihar",
    district: "Davanagere",
    bankAccountMasked: "XXXX-XXXX-3367",
    ifsc: "KKBK0008123",
    landAreaAcres: 7.4,
  },
];

class MockFruitsService implements IFruitsService {
  async getFarmerByFruitsId(fruitsId: string): Promise<Farmer | null> {
    // Simulate short network latency
    await new Promise((res) => setTimeout(res, 80));
    const normalized = fruitsId.trim();
    const found = MOCK_FARMERS.find((f) => f.fruitsId === normalized);
    return found || null;
  }

  async searchFarmers(query: string): Promise<Farmer[]> {
    await new Promise((res) => setTimeout(res, 80));
    const lower = query.toLowerCase().trim();
    return MOCK_FARMERS.filter(
      (f) =>
        f.fruitsId.includes(lower) ||
        f.nameEn.toLowerCase().includes(lower) ||
        f.phone.includes(lower) ||
        f.village.toLowerCase().includes(lower)
    );
  }
}

export const fruitsService: IFruitsService = new MockFruitsService();

