import { env } from "cloudflare:workers";
import { getWorkerSecrets } from "~/lib/worker-secrets.server";

type CreateMayarPaymentInput = {
	name: string;
	email: string;
	mobile: string;
	amount: number;
	description: string;
	redirectUrl: string;
};

type MayarCreatePaymentResponse = {
	data?: {
		id?: string;
		transactionId?: string;
		transaction_id?: string;
		link?: string;
		paymentLink?: string;
		paymentUrl?: string;
		url?: string;
	};
	id?: string;
	transactionId?: string;
	transaction_id?: string;
	paymentLink?: string;
	paymentUrl?: string;
	url?: string;
};

type MayarPaymentDetailResponse = {
	data?: {
		id?: string;
		transactionId?: string;
		transaction_id?: string;
		status?: string;
		amount?: number;
		payerEmail?: string;
		payerPhone?: string;
	};
	id?: string;
	transactionId?: string;
	transaction_id?: string;
	status?: string;
	amount?: number;
	payerEmail?: string;
	payerPhone?: string;
};

function getBaseUrl() {
	return env.MAYAR_API_BASE_URL.replace(/\/$/, "");
}

function getHeaders() {
	const secrets = getWorkerSecrets();
	return {
		Authorization: `Bearer ${secrets.MAYAR_API_KEY}`,
		"Content-Type": "application/json",
	};
}

export async function createMayarPaymentLink(input: CreateMayarPaymentInput) {
	const response = await fetch(`${getBaseUrl()}/payment/create`, {
		method: "POST",
		headers: getHeaders(),
		body: JSON.stringify({
			name: input.name,
			email: input.email,
			mobile: input.mobile,
			amount: input.amount,
			description: input.description,
			redirectUrl: input.redirectUrl,
			redirection_url: input.redirectUrl,
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to create Mayar payment link (${response.status})`);
	}

	const payload = (await response.json()) as MayarCreatePaymentResponse;
	const data = (payload.data ?? payload) as {
		id?: string;
		transactionId?: string;
		transaction_id?: string;
		link?: string;
		paymentLink?: string;
		paymentUrl?: string;
		url?: string;
	};
	const paymentLink = data.link ?? data.paymentLink ?? data.paymentUrl ?? data.url;
	const paymentId = data.id;

	if (!paymentId || !paymentLink) {
		throw new Error("Mayar create payment response was incomplete");
	}

	return {
		id: paymentId,
		transactionId: data.transactionId ?? data.transaction_id,
		paymentLink,
	};
}

export async function fetchMayarPaymentDetail(paymentId: string) {
	const response = await fetch(`${getBaseUrl()}/invoice/${paymentId}`, {
		headers: getHeaders(),
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch Mayar payment detail (${response.status})`);
	}

	const payload = (await response.json()) as MayarPaymentDetailResponse;
	const data = payload.data ?? payload;

	return {
		id: data.id,
		transactionId: data.transactionId ?? data.transaction_id,
		status: data.status,
		amount: data.amount,
		payerEmail: data.payerEmail,
		payerPhone: data.payerPhone,
	};
}
