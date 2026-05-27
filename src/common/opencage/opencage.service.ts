import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
type OpenCageResponse = {
  results: Array<{
    geometry: {
      lat: number;
      lng: number;
    };
    components?: {
      country_code?: string;
    };
  }>;
};

@Injectable()
export class OpenCageService {
  async geocode(address: string): Promise<{ lat: number; lng: number }> {
    const apiKey = process.env.OPENCAGE_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('OpenCage API Key not found');
    }

    try {
      const response = await axios.get<OpenCageResponse>(
        'https://api.opencagedata.com/geocode/v1/json',
        {
          params: {
            q: address,
            key: apiKey,
            limit: 5,
            countrycode: 'id',
            language: 'id',
            proximity: '-6.2088,106.8456',
            no_annotations: 1,
          },
        },
      );

      const idResult = response.data.results?.find(
        (r) => r.components?.country_code === 'id',
      );
      const result = idResult ?? response.data.results?.[0];
      if (!result) {
        throw new BadRequestException('Address not found');
      }
      return {
        lat: result.geometry.lat,
        lng: result.geometry.lng,
      };
    } catch (error) {
      console.error('OpenCage geocode error:', error);
      throw new BadRequestException('Failed to geocode address');
    }
  }
}
