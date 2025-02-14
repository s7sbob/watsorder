import { Table, TableHead, TableRow, TableCell, TableBody, IconButton, Chip } from "@mui/material";
import { UserFeature } from "src/context/UserContext";
import { IconEdit, IconTrash } from "@tabler/icons-react";

interface Props {
  features: UserFeature[];
  onEdit: (uf: UserFeature) => void;
  onDelete: (userFeatureId: number) => void;
}

const UserFeatureTable: React.FC<Props> = ({ features, onEdit, onDelete }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Feature Name</TableCell>
          <TableCell>Active?</TableCell>
          <TableCell>Start Date</TableCell>
          <TableCell>End Date</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {features.map((f) => (
          <TableRow key={f.id}>
            <TableCell>{f.featureName}</TableCell>
            <TableCell>
              {f.isActive ? (
                <Chip label="Active" color="success" size="small" />
              ) : (
                <Chip label="Inactive" color="default" size="small" />
              )}
            </TableCell>
            <TableCell>{f.startDate?.split("T")[0]}</TableCell>
            <TableCell>{f.endDate?.split("T")[0]}</TableCell>
            <TableCell align="right">
              <IconButton color="success" onClick={() => onEdit(f)}>
                <IconEdit width={20} />
              </IconButton>
              <IconButton color="error" onClick={() => onDelete(f.id)}>
                <IconTrash width={20} />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default UserFeatureTable;
