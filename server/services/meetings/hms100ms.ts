import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';

const HMS_API_URL = 'https://api.100ms.live/v2';

export function generateManagementToken(appAccessKey: string, appSecret: string): string {
  const payload = {
    access_key: appAccessKey,
    type: 'management',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, appSecret, {
    algorithm: 'HS256',
    expiresIn: '24h',
    jwtid: crypto.randomUUID(),
  });
}

export function gerarTokenParticipante(
  roomId: string,
  userId: string,
  role: string,
  appAccessKey: string,
  appSecret: string
): string {
  const payload = {
    access_key: appAccessKey,
    room_id: roomId,
    user_id: userId,
    role: role,
    type: 'app',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, appSecret, {
    algorithm: 'HS256',
    expiresIn: '24h',
    jwtid: crypto.randomUUID(),
  });
}

export async function criarSala(
  nome: string,
  templateId: string,
  appAccessKey: string,
  appSecret: string
): Promise<{ id: string; name: string; enabled: boolean }> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.post(
    `${HMS_API_URL}/rooms`,
    {
      name: nome,
      description: `Sala de reunião: ${nome}`,
      template_id: templateId,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

export async function desativarSala(
  roomId: string,
  appAccessKey: string,
  appSecret: string
): Promise<void> {
  const token = generateManagementToken(appAccessKey, appSecret);

  await axios.post(
    `${HMS_API_URL}/rooms/${roomId}`,
    {
      enabled: false,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

export async function obterSala(
  roomId: string,
  appAccessKey: string,
  appSecret: string
): Promise<any> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/rooms/${roomId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function listarSalas(
  appAccessKey: string,
  appSecret: string,
  limit: number = 10
): Promise<any[]> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/rooms`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      limit,
    },
  });

  return response.data.data || [];
}

export async function iniciarGravacao(
  roomId: string,
  appAccessKey: string,
  appSecret: string,
  meetingUrl: string
): Promise<{ id: string; room_id: string; session_id: string; status: string }> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.post(
    `${HMS_API_URL}/recordings/room/${roomId}/start`,
    {
      meeting_url: meetingUrl,
      resolution: { width: 1280, height: 720 },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

export async function pararGravacao(
  roomId: string,
  appAccessKey: string,
  appSecret: string
): Promise<{ id: string; room_id: string; status: string; asset: any }> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.post(
    `${HMS_API_URL}/recordings/room/${roomId}/stop`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

export async function obterGravacao(
  recordingId: string,
  appAccessKey: string,
  appSecret: string
): Promise<any> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/recordings/${recordingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function listarGravacoesSala(
  roomId: string,
  appAccessKey: string,
  appSecret: string
): Promise<any[]> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/recordings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      room_id: roomId,
    },
  });

  return response.data.data || [];
}

export async function obterAssetGravacao(
  assetId: string,
  appAccessKey: string,
  appSecret: string
): Promise<any> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/recording-assets/${assetId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function obterUrlPresignadaAsset(
  assetId: string,
  appAccessKey: string,
  appSecret: string
): Promise<{ url: string; expiry: number }> {
  const token = generateManagementToken(appAccessKey, appSecret);

  try {
    // 100ms API V2 for presigned URL needs the asset ID in the path
    // and optionally a RemotePath if the asset is not yet available or stored elsewhere
    // but typically just the assetId is enough if the recording is processed.
    const response = await axios.get(`${HMS_API_URL}/recording-assets/${assetId}/presigned-url`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(`[HMS] Erro ao obter URL presignada para asset ${assetId}:`, error.response?.data || error.message);
    
    // If RemotePath is missing error occurs, we might need to fetch the asset first to get its path
    if (error.response?.data?.message?.includes('RemotePath is missing')) {
      console.log(`[HMS] Tentando obter RemotePath para asset ${assetId}...`);
      const asset = await obterAssetGravacao(assetId, appAccessKey, appSecret);
      if (asset && asset.path) {
        const retryResponse = await axios.get(`${HMS_API_URL}/recording-assets/${assetId}/presigned-url`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            path: asset.path
          }
        });
        return retryResponse.data;
      }
    }
    throw error;
  }
}
