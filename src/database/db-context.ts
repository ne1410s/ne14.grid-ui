import * as Sequelize from "sequelize";
import * as apiConfig from "../api.json";

export class DbContext {

    public dbUser: Sequelize.Model<{}, IDbUserAttribs>;
    public dbGrid: Sequelize.Model<{}, IDbGridAttribs>;
    public dbGridProgress: Sequelize.Model<{}, IDbGridProgressAttribs>;

    public async syncStructure(): Promise<void> {
        
        const orm = new Sequelize(`sqlite:${apiConfig.dbConnection}`, {
            logging: apiConfig.dbLogging,
            operatorsAliases: false
        });

        this.dbUser = orm.define('User', this.userAttribs);
        this.dbGrid = orm.define('Grid', this.gridAttribs);
        this.dbGridProgress = orm.define('GridProgress', this.gridProgressAttribs);

        this.dbGrid.belongsTo(this.dbUser, { foreignKey: { name: 'UserID', allowNull: false } });
        this.dbUser.hasMany(this.dbGrid, { foreignKey: { name: 'AuthorID' } });        
        
        this.dbGridProgress.belongsTo(this.dbGrid, { foreignKey: { name: 'GridID', allowNull: false } });
        this.dbGrid.hasMany(this.dbGridProgress, { foreignKey: { name: 'GridID' } });

        this.dbGridProgress.belongsTo(this.dbUser, { foreignKey: { name: 'UserID', allowNull: false } });
        this.dbUser.hasMany(this.dbGridProgress, { foreignKey: { name: 'UserID' } });

        await orm.sync();
    }

    private readonly userAttribs: Sequelize.DefineModelAttributes<IDbUserAttribs> = {
        UserID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        UserName: {
            type: Sequelize.STRING(25),
            allowNull: false,
            unique: true,
        },
        PasswordHash: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        PasswordSalt: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        LastActivity: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: new Date()
        }
    };

    private readonly gridAttribs: Sequelize.DefineModelAttributes<IDbGridAttribs> = {
        GridID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        AuthorID: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        Json: {
            type: Sequelize.STRING(10000),
            allowNull: false,
        },
        Difficulty: {
            type: Sequelize.STRING(20),
            allowNull: false
        }
    };

    private readonly gridProgressAttribs: Sequelize.DefineModelAttributes<IDbGridProgressAttribs> = {
        GridProgressID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        GridID: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        UserID: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
    };
}

export interface IDbUserAttribs {
    UserID: {},
    UserName: {},
    PasswordHash: {},
    PasswordSalt: {},
    LastActivity: {},
}

export interface IDbGridAttribs {
    GridID: {},
    AuthorID: {},
    Json: {},
    Difficulty: {},
}

export interface IDbGridProgressAttribs {
    GridProgressID: {},
    GridID: {},
    UserID: {},
}
