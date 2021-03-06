import React, { useCallback, useReducer } from 'react';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { isServer } from '@/utils';
import { Formik, Form, FormikConfig } from 'formik';
import {
  Button,
  Flex,
  Alert,
  AlertIcon,
  AlertTitle,
  useClipboard,
  Text,
  Stack,
  Box,
} from '@chakra-ui/core';
import { Maybe, ShortUrlInput } from '@/types';
import BaseInput from '@/components/BaseInput';
import { ShortUrlData } from '@/api/models/ShortUrl';
import UrlShortenerSvg from './components/UrlShortenerSvg';
import ExternalLink from '@/components/ExternalLink';
import ShareButtons from './components/ShareButtons';
import UrlQrCode from './components/UrlQrCode';
import { shortUrlInputValidationSchema } from '@/utils/validationSchemas';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAxiosError(error: any): error is AxiosError {
  return (error as AxiosError).isAxiosError;
}

const qrCodeSize = 256;

type OnSubmit<FormValues> = FormikConfig<FormValues>['onSubmit'];

type UrlFormValues = ShortUrlInput;

const initialValues: UrlFormValues = {
  url: '',
  customAlias: '',
};

interface State {
  data: Maybe<ShortUrlData>;
  error: Maybe<string>;
}

type Action =
  | { type: 'request' }
  | { type: 'success'; response: AxiosResponse }
  | { type: 'error'; error: AxiosError | Error };

const doRequest = (): Action => ({
  type: 'request',
});

const doSuccess = (response: AxiosResponse): Action => ({
  type: 'success',
  response,
});

const doError = (error: AxiosError | Error): Action => ({
  type: 'error',
  error,
});

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'request':
      return { ...state, data: undefined, error: undefined };
    case 'success':
      return { ...state, data: action.response.data };
    case 'error':
      const { error } = action;
      let errorMessage = error.message;
      if (isAxiosError(error)) {
        errorMessage = error.response?.data.message ?? errorMessage;
      }
      return {
        ...state,
        error: errorMessage,
      };
    default:
      throw new Error();
  }
};

const initialState: State = {
  data: undefined,
  error: undefined,
};

const HomeView = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleSubmit = useCallback<OnSubmit<UrlFormValues>>(
    async (values, formikHelpers) => {
      dispatch(doRequest());
      try {
        const response = await axios.post('/api/shorturl', values);
        dispatch(doSuccess(response));
        formikHelpers.resetForm();
      } catch (error) {
        dispatch(doError(error));
      } finally {
        formikHelpers.setSubmitting(false);
      }
    },
    [],
  );

  const { data } = state;
  const url = data?.url;
  const alias = data?.alias;
  const origin = isServer()
    ? process.env.NEXT_PUBLIC_BASE_URL
    : window.location.origin;
  const shortenedUrl = alias ? `${origin}/${alias}` : null;

  const { onCopy, hasCopied } = useClipboard(shortenedUrl);

  const { error } = state;

  return (
    <>
      <Box flex={1} height="200px">
        <UrlShortenerSvg />
      </Box>
      <Formik<UrlFormValues>
        initialValues={initialValues}
        validationSchema={shortUrlInputValidationSchema}
        validateOnMount
        onSubmit={handleSubmit}
      >
        {({ isValid, isSubmitting }) => {
          return (
            <>
              <Form noValidate>
                <BaseInput
                  name="url"
                  label="URL"
                  isRequired
                  leftIcon="link"
                  autoFocus
                />
                <BaseInput name="customAlias" label="Custom Alias (Optional)" />
                <Flex justify="flex-end" mt={4}>
                  <Button
                    variantColor="purple"
                    type="submit"
                    isLoading={isSubmitting}
                    isDisabled={!isValid}
                  >
                    Submit
                  </Button>
                </Flex>
              </Form>
              <Stack spacing={2} marginY={1}>
                {(data || error) && (
                  <Alert status={error ? 'error' : 'success'} marginY={2}>
                    <AlertIcon />
                    <AlertTitle>
                      {error || 'Your new URL has been created successfully!'}
                    </AlertTitle>
                  </Alert>
                )}
                {url && (
                  <Box>
                    <Text fontSize="lg">
                      <Text as="span" fontWeight="bold">
                        Old URL:
                      </Text>{' '}
                      <ExternalLink href={url}>{url}</ExternalLink>
                    </Text>
                    <Text fontSize="xs">
                      <Text as="span" fontWeight="bold">
                        Old URL Length:
                      </Text>{' '}
                      {url.length} characters
                    </Text>
                  </Box>
                )}
                {shortenedUrl && (
                  <Box>
                    <Flex alignItems="center">
                      <Text fontSize="lg" isTruncated>
                        <Text as="span" fontWeight="bold">
                          New URL:
                        </Text>{' '}
                        <ExternalLink href={shortenedUrl} marginRight={2}>
                          {shortenedUrl}
                        </ExternalLink>
                      </Text>
                      <Button leftIcon="copy" onClick={onCopy} size="sm">
                        {hasCopied ? 'Copied' : 'Copy'}
                      </Button>
                    </Flex>
                    <Text fontSize="sm">
                      Click the link to open it in a new tab
                    </Text>
                    <Text fontSize="sm">
                      <Text as="span" fontWeight="bold">
                        New URL Length:
                      </Text>{' '}
                      {shortenedUrl.length} characters
                    </Text>
                  </Box>
                )}
                {shortenedUrl && (
                  <Box maxWidth={qrCodeSize}>
                    <Text fontSize="lg" fontWeight="bold">
                      QR Code:
                    </Text>
                    <UrlQrCode url={shortenedUrl} size={qrCodeSize} />
                  </Box>
                )}
                <ShareButtons url={shortenedUrl} />
              </Stack>
            </>
          );
        }}
      </Formik>
    </>
  );
};

export default HomeView;
