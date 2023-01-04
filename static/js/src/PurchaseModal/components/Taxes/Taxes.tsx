import React, { useEffect, useState } from "react";
import { Field, useFormikContext } from "formik";
import {
  Row,
  Col,
  Select,
  Input,
  ActionButton,
} from "@canonical/react-components";
import { getLabel } from "advantage/subscribe/react/utils/utils";
import {
  caProvinces,
  countries,
  USStates,
  vatCountries,
} from "advantage/countries-and-states";
import useCalculateTaxes from "PurchaseModal/hooks/useCalculateTaxes";
import useStripeCustomerInfo from "PurchaseModal/hooks/useStripeCustomerInfo";
import useMakePurchase from "PurchaseModal/hooks/useMakePurchase";
import { FormValues } from "../../utils/utils";
import { useQueryClient } from "react-query";

type TaxesProps = {
  product: any;
  quantity: number;
};

const Taxes = ({ product, quantity }: TaxesProps) => {
  const {
    errors,
    touched,
    values,
    setFieldValue,
    setErrors,
  } = useFormikContext<FormValues>();

  const queryClient = useQueryClient();

  const buyAction = values.FreeTrial === "useFreeTrial" ? "trial" : "purchase";

  const { data: userInfo } = useStripeCustomerInfo();

  const [isEditing, setIsEditing] = useState(!values.country);

  const savedCountry = userInfo?.customerInfo?.address?.country;
  const isGuest = !userInfo?.customerInfo?.email;

  useEffect(() => {
    if (savedCountry) {
      setIsEditing(!savedCountry);
    }
  }, [savedCountry]);

  const taxMutation = useCalculateTaxes({
    country: values.country,
    productListing: product?.longId,
    quantity,
    VATNumber: values.VATNumber,
  });
  const genericPurchaseMutation = useMakePurchase();

  const onSaveClick = () => {
    setIsEditing(false);
    if (isGuest || !window.accountId) {
      taxMutation.mutate();
    } else {
      genericPurchaseMutation.mutate(
        {
          formData: values,
          product,
          quantity,
          action: buyAction,
          preview: true,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries("preview");
          },
          onError: (error) => {
            if (error instanceof Error && error.message === "tax_id_invalid") {
              setErrors({
                VATNumber:
                  "That VAT number is invalid. Check the number and try again.",
              });
            }
          },
        }
      );
    }
  };

  const onEditClick = () => {
    setIsEditing(true);
  };

  const validateRequired = (value: string) => {
    let errorMessage;
    if (!value) {
      errorMessage = "This field is required.";
    }
    return errorMessage;
  };

  const validateUSState = (value: string) => {
    let errorMessage;
    if (!value && values.country === "US") {
      errorMessage = "This field is required.";
    }
    return errorMessage;
  };

  const validatecaProvince = (value: string) => {
    let errorMessage;
    if (!value && values.country === "CA") {
      errorMessage = "This field is required.";
    }
    return errorMessage;
  };

  useEffect(() => {
    if (!vatCountries.includes(values.country ?? "")) {
      setFieldValue("VATNumber", "");
    }
    if (values.country !== "US") {
      setFieldValue("usState", "");
    }
    if (values.country !== "CA") {
      setFieldValue("caProvince", "");
    }
  }, [values.country]);

  const displayMode = (
    <>
      <Col size={4}>
        <p>Your country:</p>
      </Col>
      <Col size={8}>
        <p>
          <strong>{getLabel(values.country ?? "", countries)}</strong>
        </p>
      </Col>
      {values.usState ? (
        <>
          <Col size={4}>
            <p>Your state:</p>
          </Col>
          <Col size={8}>
            <p>
              <strong>{getLabel(values.usState, USStates)}</strong>
            </p>
          </Col>
        </>
      ) : null}
      {values.caProvince ? (
        <>
          <Col size={4}>
            <p>Your province:</p>
          </Col>
          <Col size={8}>
            <p>
              <strong>{getLabel(values.caProvince, caProvinces)}</strong>
            </p>
          </Col>
        </>
      ) : null}
      {vatCountries.includes(values.country ?? "") ? (
        <>
          <Col size={4}>
            <p>VAT number:</p>
          </Col>
          <Col size={8}>
            <p>
              <strong>{values.VATNumber ? values.VATNumber : "None"}</strong>
            </p>
          </Col>
        </>
      ) : null}
    </>
  );

  const editMode = (
    <>
      <Field
        data-testid="select-country"
        as={Select}
        id="country"
        name="country"
        options={countries}
        label="Country/Region:"
        stacked
        required
        validate={validateRequired}
        error={touched?.country && errors?.country}
      />
      {values.country === "US" && (
        <Field
          data-testid="select-state"
          as={Select}
          id="usStates"
          name="usState"
          options={USStates}
          label="State:"
          stacked
          required
          validate={validateUSState}
          error={touched?.usState && errors?.usState}
        />
      )}
      {values.country === "CA" && (
        <Field
          as={Select}
          id="caProvinces"
          name="caProvince"
          options={caProvinces}
          label="Province:"
          stacked
          required
          validate={validatecaProvince}
          error={touched?.caProvince && errors?.caProvince}
        />
      )}
      {vatCountries.includes(values.country ?? "") && (
        <Field
          as={Input}
          type="text"
          id="VATNumber"
          name="VATNumber"
          label="VAT number:"
          stacked
          help="e.g. GB 123 1234 12 123 or GB 123 4567 89 1234"
          error={touched?.VATNumber && errors?.VATNumber}
        />
      )}
    </>
  );

  return (
    <Row>
      {isEditing ? editMode : displayMode}
      <div className="u-align--right">
        {isEditing ? (
          <ActionButton onClick={onSaveClick}>Save</ActionButton>
        ) : (
          <ActionButton onClick={onEditClick}>Edit</ActionButton>
        )}
      </div>
    </Row>
  );
};

export default Taxes;
