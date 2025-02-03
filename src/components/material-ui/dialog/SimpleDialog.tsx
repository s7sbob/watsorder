// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import {
  Typography,
  Button,
  Dialog,
  DialogTitle,

} from '@mui/material';


const emails = ['JohnDeo@gmail.com', 'SmithRocky@gmail.com'];

const SimpleDialog = () => {
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(emails[1]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = (value: string) => {
    setOpen(false);
    setSelectedValue(value);
  };

  return (
    <>
      <Button variant="contained" color="primary" fullWidth onClick={handleClickOpen}>
        Open Simple Dialog
      </Button>
      <Typography variant="subtitle1" component="div" mb={1} textAlign="center">
        Selected: {selectedValue}
      </Typography>
      <Dialog onClose={() => handleClose(selectedValue)} open={open}>
        <DialogTitle>Set backup account</DialogTitle>

      </Dialog>
    </>
  );
};

export default SimpleDialog;
