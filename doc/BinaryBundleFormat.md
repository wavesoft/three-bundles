
# Binary Bundle Format

The binary bundle is a compacted representation of javascript objects, further optimised for minimising the space THREE.js objects occupy. In addition, it offers a symbol import/export functionality for sharing resources among different bundles.

## Opcodes

The following table contains all the opcodes used in the file format.

<table>
    <tbody>
        <tr>
            <th>OPCODE</th>
            <th>PRIMITIVE</th>
            <th>HEX</th>
            <th>MASK &amp;</th>
            <th>MASK =</th>
            <th>7</th>
            <th>6</th>
            <th>5</th>
            <th>4</th>
            <th>3</th>
            <th>2</th>
            <th>1</th>
            <th>0</th>
            <th>+ BYTES</th>
            <th>DESCRIPTION</th>
        </tr>
        <tr>
            <th>EXTENDED</th>
            <td>-</td>
            <td>0xFF</td>
            <td>0xFF</td>
            <td>0xFF</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>-</td>
            <td>Extended opcode (Future use)</td>
        </tr>
        <tr>
            <th>DICT</th>
            <td>Object</td>
            <td>0xFE</td>
            <td>0xFF</td>
            <td>0xFE</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>1</td>
            <td>Begin a DICT primitive (untyped js object)</td>
        </tr>
        <tr>
            <th>EXPORT</th>
            <td>-</td>
            <td>0xFC</td>
            <td>0xFE</td>
            <td>0xFC</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>2</td>
            <td>Tag the next primitive as a named export</td>
        </tr>
        <tr>
            <th>IMPORT</th>
            <td>-</td>
            <td>0xFD</td>
            <td>0xFE</td>
            <td>0xFC</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>1</td>
            <td>2</td>
            <td>Refer to the primitive with the specified name</td>
        </tr>
        <tr>
            <th>UNDEFINED</th>
            <td>Undefined</td>
            <td>0xF8</td>
            <td>0xFC</td>
            <td>0xF8</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>-</td>
            <td>An UNDEFINED primitive</td>
        </tr>
        <tr>
            <th>NULL</th>
            <td>Null</td>
            <td>0xF9</td>
            <td>0xFC</td>
            <td>0xF8</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>1</td>
            <td>-</td>
            <td>A NULL primitive</td>
        </tr>
        <tr>
            <th>FALSE</th>
            <td>Boolean</td>
            <td>0xFA</td>
            <td>0xFC</td>
            <td>0xF8</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>1</td>
            <td>0</td>
            <td>-</td>
            <td>A boolean FALSE primitive</td>
        </tr>
        <tr>
            <th>TRUE</th>
            <td>Boolean</td>
            <td>0xFB</td>
            <td>0xFC</td>
            <td>0xF8</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>1</td>
            <td>1</td>
            <td>-</td>
            <td>A boolean TRUE primitive</td>
        </tr>
        <tr>
            <th>PAD_ALIGN</th>
            <td>-</td>
            <td>0xF0</td>
            <td>0xF8</td>
            <td>0xF0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td colspan="3">PAD_SIZE</td>
            <td>0 - 7</td>
            <td>Bit-alignment padding</td>
        </tr>
        <tr>
            <th>STRING_8</th>
            <td>String</td>
            <td>0xE0</td>
            <td>0xF0</td>
            <td>0xE0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>1</td>
            <td>Length prefixed string (8-bit length)</td>
        </tr>
        <tr>
            <th>STRING_16</th>
            <td>String</td>
            <td>0xE1</td>
            <td>0xF0</td>
            <td>0xE0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>1</td>
            <td>2</td>
            <td>Length prefixed string (16-bit length)</td>
        </tr>
        <tr>
            <th>STRING_32</th>
            <td>String</td>
            <td>0xE2</td>
            <td>0xF0</td>
            <td>0xE0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>1</td>
            <td>0</td>
            <td>4</td>
            <td>Length prefixed string (32-bit length)</td>
        </tr>
        <tr>
            <th>ARRAY_X_8</th>
            <td>Array</td>
            <td>0xE3</td>
            <td>0xF0</td>
            <td>0xE0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>Array of any primitives (8-bit length)</td>
        </tr>
        <tr>
            <th>ARRAY_X_16</th>
            <td>Array</td>
            <td>0xE4</td>
            <td>0xF0</td>
            <td>0xE0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>2</td>
            <td>Array of any primitives (16-bit length)</td>
        </tr>
        <tr>
            <th>ARRAY_X_32</th>
            <td>Array</td>
            <td>0xE5</td>
            <td>0xF0</td>
            <td>0xE0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>1</td>
            <td>0</td>
            <td>1</td>
            <td>4</td>
            <td>Array of any primitives (32-bit length)</td>
        </tr>
        <tr>
            <th>ARRAY_EMPTY</th>
            <td>Array</td>
            <td>0xE6</td>
            <td>0xF0</td>
            <td>0xE0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>-</td>
            <td>An empty array</td>
        </tr>
        <tr>
            <th>REF_16</th>
            <td>Object</td>
            <td>0xE7</td>
            <td>0xF0</td>
            <td>0xE0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>2</td>
            <td>A reference to a local entity (16-bit lookup index)</td>
        </tr>
        <tr>
            <th>STRING_3</th>
            <td>String</td>
            <td>0xE8</td>
            <td>0xF8</td>
            <td>0xE8</td>
            <td>1</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>1</td>
            <td clspan="3">N</td>
            <td>&nbsp;</td>
            <td>Length prefixed string (3-bit length)</td>
        </tr>
        <tr>
            <th>NUMBER_1</th>
            <td>Number</td>
            <td>0xC0</td>
            <td>0xF8</td>
            <td>0xC0</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td colspan"3">NUMTYPE</td>
            <td>-</td>
            <td>A single number primitive</td>
        </tr>
        <tr>
            <th>ARRAY_8</th>
            <td>TypedArray</td>
            <td>0xC8</td>
            <td>0xF8</td>
            <td>0xC8</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td>1</td>
            <td colspan"3">NUMTYPE</td>
            <td>1</td>
            <td>A TypedArray of numbers (8-bit length)</td>
        </tr>
        <tr>
            <th>ARRAY_16</th>
            <td>TypedArray</td>
            <td>0xD0</td>
            <td>0xF8</td>
            <td>0xD0</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>1</td>
            <td>0</td>
            <td colspan"3">NUMTYPE</td>
            <td>2</td>
            <td>A TypedArray of numbers (16-bit length)</td>
        </tr>
        <tr>
            <th>ARRAY_32</th>
            <td>TypedArray</td>
            <td>0xD8</td>
            <td>0xF8</td>
            <td>0xD8</td>
            <td>1</td>
            <td>1</td>
            <td>0</td>
            <td>1</td>
            <td>1</td>
            <td colspan"3">NUMTYPE</td>
            <td>4</td>
            <td>A TypedArray of numbers (32-bit length)</td>
        </tr>
        <tr>
            <th>ENTITY_5</th>
            <td>Object</td>
            <td>0x80</td>
            <td>0xE0</td>
            <td>0x80</td>
            <td>1</td>
            <td>0</td>
            <td>0</td>
            <td colspan="5">EID[5:0] (0-31)</td>
            <td>-</td>
            <td>Begin an entity with 5-bit Entity ID</td>
        </tr>
        <tr>
            <th>ENTITY_13</th>
            <td>Object</td>
            <td>0xA0</td>
            <td>0xE0</td>
            <td>0xA0</td>
            <td>1</td>
            <td>0</td>
            <td>1</td>
            <td colspan="">EID[13:8]</td>
            <td>1</td>
            <td>Begin an entity with 13-bit Entity ID</td>
        </tr>
        <tr>
            <th>NUMBER_N</th>
            <td>[ Number ]</td>
            <td>0x00</td>
            <td>0x80</td>
            <td>0x00</td>
            <td>0</td>
            <td clspan="4">N</td>
            <td colspan"3">NUMTYPE</td>
            <td>&nbsp;</td>
            <td>Continuous N number primitives</td>
        </tr>
    </tbody>
</table>
